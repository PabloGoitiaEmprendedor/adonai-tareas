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
