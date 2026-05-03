import FloatingActionMenu from './ui/floating-action-menu';
import { Plus, Mic } from 'lucide-react';

interface FABProps {
  onTextClick: () => void;
  onVoiceClick: () => void;
}

const FAB = ({ onTextClick, onVoiceClick }: FABProps) => {
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
      ]}
    />
  );
};

export default FAB;
