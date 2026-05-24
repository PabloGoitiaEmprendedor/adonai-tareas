import FloatingActionMenu from './ui/floating-action-menu';
import { Plus, Mic, Repeat, Calendar } from 'lucide-react';

interface FABProps {
  onTextClick: () => void;
  onVoiceClick: () => void;
  onRecurrenceClick: () => void;
  onEventClick?: () => void;
}

const FAB = ({ onTextClick, onVoiceClick, onRecurrenceClick, onEventClick }: FABProps) => {
  const allOptions = [
    {
      label: "Tarea por texto",
      icon: <Plus />,
      onClick: onTextClick,
    },
    {
      label: "Tarea por voz",
      icon: <Mic />,
      onClick: onVoiceClick,
    },
    {
      label: "Tarea recurrente",
      icon: <Repeat />,
      onClick: onRecurrenceClick,
    },
  ];
  if (onEventClick) {
    allOptions.push({
      label: "Evento",
      icon: <Calendar />,
      onClick: onEventClick,
    });
  }
  return (
    <FloatingActionMenu
      options={allOptions}
    />
  );
};

export default FAB;
