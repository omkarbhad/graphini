import { useBoard } from '@plait-board/react-board';
import Stack from '../../stack';
import { ToolButton } from '../../tool-button';
import { MenuIcon } from '../../icons';
import { classNames } from '../../../utils/classnames';
import {
  ATTACHED_ELEMENT_CLASS_NAME,
  PlaitBoard,
} from '@plait/core';
import { Island } from '../../island';
import { Popover, PopoverContent, PopoverTrigger } from '../../popover/popover';
import { useState } from 'react';
import { CleanBoard, OpenFile, SaveAsImage, SaveToFile, Socials } from './app-menu-items';
import { LanguageSwitcherMenu } from './language-switcher-menu';
import Menu from '../../menu/menu';
import MenuSeparator from '../../menu/menu-separator';
import { useI18n } from '../../../i18n';

type AppToolbarOrientation = 'vertical' | 'horizontal';

type AppToolbarProps = {
  orientation?: AppToolbarOrientation;
};

export const AppToolbar = ({ orientation = 'vertical' }: AppToolbarProps) => {
  const board = useBoard();
  const { t } = useI18n();
  const container = PlaitBoard.getBoardContainer(board);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const StackComponent = orientation === 'horizontal' ? Stack.Row : Stack.Col;

  return (
    <Island
      padding={1}
      data-orientation={orientation}
      className={classNames('app-toolbar', ATTACHED_ELEMENT_CLASS_NAME)}
    >
      <StackComponent gap={1} className={classNames({ 'app-toolbar__stack--horizontal': orientation === 'horizontal' })}>
        <Popover
          key={0}
          sideOffset={12}
          open={appMenuOpen}
          onOpenChange={(open) => {
            setAppMenuOpen(open);
          }}
          placement="bottom-start"
        >
          <PopoverTrigger asChild>
            <ToolButton
              type="icon"
              visible={true}
              selected={appMenuOpen}
              icon={MenuIcon}
              title={t('general.menu')}
              aria-label={t('general.menu')}
              onPointerDown={() => {
                setAppMenuOpen(!appMenuOpen);
              }}
            />
          </PopoverTrigger>
          <PopoverContent container={container}>
            <Menu
              onSelect={() => {
                setAppMenuOpen(false);
              }}
            >
              <OpenFile></OpenFile>
              <SaveToFile></SaveToFile>
              <SaveAsImage></SaveAsImage>
              <CleanBoard></CleanBoard>
              <MenuSeparator />
              <LanguageSwitcherMenu />
              <Socials />
            </Menu>
          </PopoverContent>
        </Popover>

      </StackComponent>
    </Island>
  );
};
