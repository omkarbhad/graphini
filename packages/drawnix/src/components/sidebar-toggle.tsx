import React from 'react';
import { PanelRight } from 'lucide-react';
import { ToolButton } from './tool-button';
import { classNames } from '../utils/classnames';

interface SidebarToggleProps {
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
}

export const SidebarToggle: React.FC<SidebarToggleProps> = ({
  sidebarCollapsed = false,
  onSidebarToggle,
}) => {
  const toggleLabel = sidebarCollapsed ? 'Open agent sidebar' : 'Collapse agent sidebar';

  return (
    <ToolButton
      type="icon"
      icon={<PanelRight className={classNames('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')} />}
      title={toggleLabel}
      aria-label={toggleLabel}
      onPointerUp={onSidebarToggle}
      visible={true}
      className="h-8 w-8 rounded-full text-white hover:bg-white/10"
    />
  );
};
