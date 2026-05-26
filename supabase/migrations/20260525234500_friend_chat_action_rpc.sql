CREATE OR REPLACE FUNCTION public.friend_chat_action(action TEXT, payload JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  conv_id UUID;
  friend_id UUID;
  group_title TEXT;
  invite_id UUID;
  folder_id UUID;
  request_id UUID;
  message_rec public.friend_messages%ROWTYPE;
  convo_rec public.friend_conversations%ROWTYPE;
  request_rec public.friend_task_requests%ROWTYPE;
  task_rec public.tasks%ROWTYPE;
  submission_rec public.friend_invite_task_submissions%ROWTYPE;
  unread_total INTEGER;
  invite_total INTEGER;
BEGIN
  IF action = 'invite_submit' THEN
    invite_id := NULLIF(TRIM(payload->>'inviter_id'), '')::UUID;
    IF invite_id IS NULL THEN
      RAISE EXCEPTION 'inviter_id is required';
    END IF;

    IF CHAR_LENGTH(TRIM(COALESCE(payload->>'title', ''))) < 2 THEN
      RAISE EXCEPTION 'title is required';
    END IF;

    INSERT INTO public.friend_invite_task_submissions(
      inviter_id,
      sender_name,
      sender_email,
      task_payload,
      message,
      status,
      created_at,
      updated_at
    )
    VALUES (
      invite_id,
      NULLIF(TRIM(payload->>'sender_name'), ''),
      NULLIF(TRIM(payload->>'sender_email'), ''),
      COALESCE(payload->'task_payload', '{}'::jsonb),
      NULLIF(TRIM(payload->>'message'), ''),
      'pending',
      now(),
      now()
    )
    RETURNING * INTO submission_rec;

    RETURN jsonb_build_object('submission', to_jsonb(submission_rec));
  END IF;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '28000';
  END IF;

  IF action = 'summary' THEN
    SELECT COALESCE(SUM(unread_count), 0)::INT
      INTO unread_total
    FROM public.friend_conversation_members
    WHERE user_id = uid;

    SELECT COUNT(*)::INT
      INTO invite_total
    FROM public.friend_invite_task_submissions
    WHERE inviter_id = uid
      AND status = 'pending';

    RETURN jsonb_build_object(
      'unread_count', unread_total,
      'invite_task_count', invite_total
    );
  END IF;

  IF action = 'list' THEN
    IF payload ? 'conversation_id' THEN
      conv_id := NULLIF(TRIM(payload->>'conversation_id'), '')::UUID;
      IF conv_id IS NULL THEN
        RAISE EXCEPTION 'conversation_id is required';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM public.friend_conversation_members
        WHERE conversation_id = conv_id
          AND user_id = uid
      ) THEN
        RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
      END IF;

      RETURN jsonb_build_object(
        'conversation', (
          SELECT to_jsonb(c)
          FROM public.friend_conversations c
          WHERE c.id = conv_id
        ),
        'members', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'conversation_id', m.conversation_id,
              'user_id', m.user_id,
              'role', m.role,
              'unread_count', m.unread_count,
              'last_read_at', m.last_read_at,
              'created_at', m.created_at,
              'profile', jsonb_build_object(
                'user_id', p.user_id,
                'name', p.name,
                'email', p.email
              )
            )
            ORDER BY m.created_at ASC
          )
          FROM public.friend_conversation_members m
          LEFT JOIN public.profiles p ON p.user_id = m.user_id
          WHERE m.conversation_id = conv_id
        ), '[]'::jsonb),
        'messages', COALESCE((
          SELECT jsonb_agg(to_jsonb(msg) ORDER BY msg.created_at ASC)
          FROM public.friend_messages msg
          WHERE msg.conversation_id = conv_id
        ), '[]'::jsonb),
        'task_requests', COALESCE((
          SELECT jsonb_agg(to_jsonb(req) ORDER BY req.created_at DESC)
          FROM public.friend_task_requests req
          WHERE req.conversation_id = conv_id
            AND (req.sender_id = uid OR req.receiver_id = uid)
        ), '[]'::jsonb)
      );
    END IF;

    RETURN jsonb_build_object(
      'conversations', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'type', c.type,
            'title', c.title,
            'conversation_key', c.conversation_key,
            'created_by', c.created_by,
            'created_at', c.created_at,
            'updated_at', c.updated_at,
            'me', (
              SELECT jsonb_build_object(
                'conversation_id', m.conversation_id,
                'user_id', m.user_id,
                'role', m.role,
                'unread_count', m.unread_count,
                'last_read_at', m.last_read_at,
                'created_at', m.created_at
              )
              FROM public.friend_conversation_members m
              WHERE m.conversation_id = c.id
                AND m.user_id = uid
            ),
            'members', COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object(
                  'conversation_id', m.conversation_id,
                  'user_id', m.user_id,
                  'role', m.role,
                  'unread_count', m.unread_count,
                  'last_read_at', m.last_read_at,
                  'created_at', m.created_at,
                  'profile', jsonb_build_object(
                    'user_id', p.user_id,
                    'name', p.name,
                    'email', p.email
                  )
                )
                ORDER BY m.created_at ASC
              )
              FROM public.friend_conversation_members m
              LEFT JOIN public.profiles p ON p.user_id = m.user_id
              WHERE m.conversation_id = c.id
            ), '[]'::jsonb),
            'lastMessage', (
              SELECT to_jsonb(msg)
              FROM public.friend_messages msg
              WHERE msg.conversation_id = c.id
              ORDER BY msg.created_at DESC
              LIMIT 1
            )
          )
          ORDER BY c.updated_at DESC
        )
        FROM public.friend_conversations c
        INNER JOIN public.friend_conversation_members mine
          ON mine.conversation_id = c.id
         AND mine.user_id = uid
      ), '[]'::jsonb)
    );
  END IF;

  IF action = 'ensure_direct' THEN
    friend_id := NULLIF(TRIM(payload->>'friend_id'), '')::UUID;
    IF friend_id IS NULL THEN
      RAISE EXCEPTION 'friend_id is required';
    END IF;

    SELECT *
      INTO convo_rec
    FROM public.friend_conversations
    WHERE conversation_key = 'direct:' || LEAST(uid::TEXT, friend_id::TEXT) || ':' || GREATEST(uid::TEXT, friend_id::TEXT)
    LIMIT 1;

    IF NOT FOUND THEN
      INSERT INTO public.friend_conversations(
        id,
        type,
        conversation_key,
        created_by,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        'direct',
        'direct:' || LEAST(uid::TEXT, friend_id::TEXT) || ':' || GREATEST(uid::TEXT, friend_id::TEXT),
        uid,
        now(),
        now()
      )
      RETURNING * INTO convo_rec;
    END IF;

    INSERT INTO public.friend_conversation_members(conversation_id, user_id, role)
    VALUES
      (convo_rec.id, uid, 'owner'),
      (convo_rec.id, friend_id, 'member')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

    RETURN jsonb_build_object('conversation', to_jsonb(convo_rec));
  END IF;

  IF action = 'create_group' THEN
    group_title := NULLIF(TRIM(payload->>'title'), '');
    IF group_title IS NULL THEN
      RAISE EXCEPTION 'title is required';
    END IF;

    INSERT INTO public.friend_conversations(
      id,
      type,
      title,
      created_by,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      'group',
      group_title,
      uid,
      now(),
      now()
    )
    RETURNING * INTO convo_rec;

    INSERT INTO public.friend_conversation_members(conversation_id, user_id, role)
    SELECT convo_rec.id, member_id, CASE WHEN member_id = uid THEN 'owner' ELSE 'member' END
    FROM (
      SELECT DISTINCT uid AS member_id
      UNION
      SELECT DISTINCT value::UUID AS member_id
      FROM jsonb_array_elements_text(COALESCE(payload->'member_ids', '[]'::jsonb))
    ) members
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

    RETURN jsonb_build_object('conversation', to_jsonb(convo_rec));
  END IF;

  IF action = 'mark_read' THEN
    conv_id := NULLIF(TRIM(payload->>'conversation_id'), '')::UUID;
    IF conv_id IS NULL THEN
      RAISE EXCEPTION 'conversation_id is required';
    END IF;

    UPDATE public.friend_conversation_members
    SET unread_count = 0,
        last_read_at = now()
    WHERE conversation_id = conv_id
      AND user_id = uid;

    RETURN jsonb_build_object('ok', true);
  END IF;

  IF action = 'send_message' THEN
    conv_id := NULLIF(TRIM(payload->>'conversation_id'), '')::UUID;
    IF conv_id IS NULL THEN
      RAISE EXCEPTION 'conversation_id is required';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.friend_conversation_members
      WHERE conversation_id = conv_id
        AND user_id = uid
    ) THEN
      RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.friend_messages(
      conversation_id,
      sender_id,
      kind,
      body,
      payload,
      created_at
    )
    VALUES (
      conv_id,
      uid,
      COALESCE(NULLIF(payload->>'kind', ''), 'text'),
      NULLIF(payload->>'body', ''),
      COALESCE(payload->'payload', '{}'::jsonb),
      now()
    )
    RETURNING * INTO message_rec;

    UPDATE public.friend_conversations
    SET updated_at = now()
    WHERE id = conv_id;

    UPDATE public.friend_conversation_members
    SET unread_count = unread_count + 1
    WHERE conversation_id = conv_id
      AND user_id <> uid;

    RETURN jsonb_build_object('message', to_jsonb(message_rec));
  END IF;

  IF action = 'send_task_request' THEN
    conv_id := NULLIF(TRIM(payload->>'conversation_id'), '')::UUID;
    friend_id := NULLIF(TRIM(payload->>'receiver_id'), '')::UUID;
    IF conv_id IS NULL OR friend_id IS NULL THEN
      RAISE EXCEPTION 'conversation_id and receiver_id are required';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.friend_conversation_members
      WHERE conversation_id = conv_id
        AND user_id = uid
    ) THEN
      RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.friend_messages(
      conversation_id,
      sender_id,
      kind,
      body,
      payload,
      created_at
    )
    VALUES (
      conv_id,
      uid,
      'task_request',
      COALESCE(payload->'task'->>'title', 'Tarea'),
      jsonb_build_object(
        'task', COALESCE(payload->'task', '{}'::jsonb),
        'scheduled_for', payload->>'scheduled_for',
        'status', 'pending'
      ),
      now()
    )
    RETURNING id INTO message_id;

    INSERT INTO public.friend_task_requests(
      message_id,
      conversation_id,
      sender_id,
      receiver_id,
      task_payload,
      scheduled_for,
      status,
      created_at,
      updated_at
    )
    VALUES (
      message_id,
      conv_id,
      uid,
      friend_id,
      COALESCE(payload->'task', '{}'::jsonb),
      NULLIF(payload->>'scheduled_for', '')::TIMESTAMPTZ,
      'pending',
      now(),
      now()
    )
    RETURNING * INTO request_rec;

    UPDATE public.friend_conversations
    SET updated_at = now()
    WHERE id = conv_id;

    UPDATE public.friend_conversation_members
    SET unread_count = unread_count + 1
    WHERE conversation_id = conv_id
      AND user_id <> uid;

    RETURN jsonb_build_object('request', to_jsonb(request_rec));
  END IF;

  IF action = 'approve_task_request' THEN
    request_id := NULLIF(TRIM(payload->>'request_id'), '')::UUID;
    folder_id := NULLIF(TRIM(payload->>'folder_id'), '')::UUID;
    IF request_id IS NULL THEN
      RAISE EXCEPTION 'request_id is required';
    END IF;

    SELECT *
      INTO request_rec
    FROM public.friend_task_requests
    WHERE id = request_id
      AND receiver_id = uid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Request not found or forbidden';
    END IF;

    INSERT INTO public.tasks(
      title,
      description,
      link,
      status,
      priority,
      urgency,
      importance,
      due_date,
      estimated_minutes,
      folder_id,
      user_id,
      metadata,
      created_at
    )
    VALUES (
      COALESCE(request_rec.task_payload->>'title', 'Tarea'),
      NULLIF(request_rec.task_payload->>'description', ''),
      NULLIF(request_rec.task_payload->>'link', ''),
      'pending',
      COALESCE(request_rec.task_payload->>'priority', 'medium'),
      COALESCE((request_rec.task_payload->>'urgency')::BOOLEAN, false),
      COALESCE((request_rec.task_payload->>'importance')::BOOLEAN, false),
      COALESCE(NULLIF(request_rec.task_payload->>'due_date', '')::DATE, CURRENT_DATE),
      COALESCE((request_rec.task_payload->>'estimated_minutes')::INT, 30),
      folder_id,
      uid,
      jsonb_build_object(
        'creation_source', 'friend_task_request',
        'friend_task_request_id', request_id
      ),
      now()
    )
    RETURNING * INTO task_rec;

    UPDATE public.friend_task_requests
    SET status = 'approved',
        target_folder_id = folder_id,
        created_task_id = task_rec.id,
        updated_at = now()
    WHERE id = request_id;

    INSERT INTO public.friend_messages(
      conversation_id,
      sender_id,
      kind,
      body,
      payload,
      created_at
    )
    VALUES (
      request_rec.conversation_id,
      uid,
      'system',
      'Tarea aprobada: ' || COALESCE(request_rec.task_payload->>'title', 'Sin titulo'),
      jsonb_build_object('request_id', request_id, 'status', 'approved'),
      now()
    );

    UPDATE public.friend_conversations
    SET updated_at = now()
    WHERE id = request_rec.conversation_id;

    RETURN jsonb_build_object('task', to_jsonb(task_rec), 'request_id', request_id);
  END IF;

  IF action = 'reject_task_request' THEN
    request_id := NULLIF(TRIM(payload->>'request_id'), '')::UUID;
    IF request_id IS NULL THEN
      RAISE EXCEPTION 'request_id is required';
    END IF;

    SELECT *
      INTO request_rec
    FROM public.friend_task_requests
    WHERE id = request_id
      AND receiver_id = uid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Request not found or forbidden';
    END IF;

    UPDATE public.friend_task_requests
    SET status = 'rejected',
        updated_at = now()
    WHERE id = request_id;

    INSERT INTO public.friend_messages(
      conversation_id,
      sender_id,
      kind,
      body,
      payload,
      created_at
    )
    VALUES (
      request_rec.conversation_id,
      uid,
      'system',
      'Tarea rechazada: ' || COALESCE(request_rec.task_payload->>'title', 'Sin titulo'),
      jsonb_build_object('request_id', request_id, 'status', 'rejected'),
      now()
    );

    UPDATE public.friend_conversations
    SET updated_at = now()
    WHERE id = request_rec.conversation_id;

    RETURN jsonb_build_object('request_id', request_id);
  END IF;

  IF action = 'invite_list' THEN
    RETURN jsonb_build_object(
      'submissions', COALESCE((
        SELECT jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC)
        FROM public.friend_invite_task_submissions s
        WHERE s.inviter_id = uid
          AND s.status = 'pending'
      ), '[]'::jsonb)
    );
  END IF;

  IF action = 'invite_approve' THEN
    invite_id := NULLIF(TRIM(payload->>'submission_id'), '')::UUID;
    folder_id := NULLIF(TRIM(payload->>'folder_id'), '')::UUID;
    IF invite_id IS NULL THEN
      RAISE EXCEPTION 'submission_id is required';
    END IF;

    SELECT *
      INTO submission_rec
    FROM public.friend_invite_task_submissions
    WHERE id = invite_id
      AND inviter_id = uid;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invite submission not found or forbidden';
    END IF;

    INSERT INTO public.tasks(
      title,
      description,
      link,
      status,
      priority,
      urgency,
      importance,
      due_date,
      estimated_minutes,
      folder_id,
      user_id,
      metadata,
      created_at
    )
    VALUES (
      COALESCE(submission_rec.task_payload->>'title', 'Tarea'),
      NULLIF(submission_rec.task_payload->>'description', ''),
      NULLIF(submission_rec.task_payload->>'link', ''),
      'pending',
      COALESCE(submission_rec.task_payload->>'priority', 'medium'),
      COALESCE((submission_rec.task_payload->>'urgency')::BOOLEAN, false),
      COALESCE((submission_rec.task_payload->>'importance')::BOOLEAN, false),
      COALESCE(NULLIF(submission_rec.task_payload->>'due_date', '')::DATE, CURRENT_DATE),
      COALESCE((submission_rec.task_payload->>'estimated_minutes')::INT, 30),
      folder_id,
      uid,
      jsonb_build_object(
        'creation_source', 'friend_invite_link',
        'invite_submission_id', invite_id,
        'sender_name', submission_rec.sender_name,
        'sender_email', submission_rec.sender_email,
        'message', submission_rec.message
      ),
      now()
    )
    RETURNING * INTO task_rec;

    UPDATE public.friend_invite_task_submissions
    SET status = 'approved',
        created_task_id = task_rec.id,
        updated_at = now()
    WHERE id = invite_id;

    RETURN jsonb_build_object('task', to_jsonb(task_rec), 'submission_id', invite_id);
  END IF;

  IF action = 'invite_reject' THEN
    invite_id := NULLIF(TRIM(payload->>'submission_id'), '')::UUID;
    IF invite_id IS NULL THEN
      RAISE EXCEPTION 'submission_id is required';
    END IF;

    UPDATE public.friend_invite_task_submissions
    SET status = 'rejected',
        updated_at = now()
    WHERE id = invite_id
      AND inviter_id = uid;

    RETURN jsonb_build_object('submission_id', invite_id);
  END IF;

  RAISE EXCEPTION 'Unknown action: %', action;
END;
$$;

GRANT EXECUTE ON FUNCTION public.friend_chat_action(TEXT, JSONB) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
