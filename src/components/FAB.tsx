import FloatingActionMenu from './ui/floating-action-menu';
import { Pencil, Repeat, Calendar } from 'lucide-react';

interface FABProps {
  onTextClick: () => void;
  onVoiceClick?: () => void;
  onRecurrenceClick: () => void;
  onEventClick?: () => void;
  contextLabel?: string;
}

const FAB = ({ onTextClick, onVoiceClick, onRecurrenceClick, onEventClick, contextLabel }: FABProps) => {
  const allOptions = [
    {
      label: "Tarea por texto",
      icon: <Pencil />,
      onClick: onTextClick,
    },
    {
      label: "Tarea recurrente",
      icon: <Repeat />,
      onClick: onRecurrenceClick,
    },
  ];
  if (onEventClick) {
    allOptions.push({
      label: "Recordatorio",
      icon: <Calendar />,
      onClick: onEventClick,
    });
  }
  return (
    <FloatingActionMenu
      options={allOptions}
      contextLabel={contextLabel}
    />
  );
};

export default FAB;
