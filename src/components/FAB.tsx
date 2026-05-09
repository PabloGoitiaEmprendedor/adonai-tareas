import FloatingActionMenu from './ui/floating-action-menu';
import { Plus, Mic, Repeat } from 'lucide-react';

interface FABProps {
  onTextClick: () => void;
  onVoiceClick: () => void;
  onRecurrenceClick: () => void;
}

const FAB = ({ onTextClick, onVoiceClick, onRecurrenceClick }: FABProps) => {
  return (
    <FloatingActionMenu
      options={[
        {
          label: "Texto",
          icon: <Plus />,
          onClick: onTextClick,
        },
        {
          label: "Voz",
          icon: <Mic />,
          onClick: onVoiceClick,
        },
        {
          label: "Recurrencia",
          icon: <Repeat />,
          onClick: onRecurrenceClick,
        },
      ]}
    />
  );
};

export default FAB;
