import { 
  Eraser, 
  MousePointer, 
  PenTool, 
  Pointer, 
  Shapes, 
  Type, 
  Waypoints,
  Square,
  Terminal,
  Circle,
  Triangle,
  Diamond,
  ArrowRight,
  CornerDownRight,
  Menu,
  Github,
  Download,
  ZoomOut,
  ZoomIn,
  Save,
  FolderOpen,
  Palette,
  X,
  Check as CheckIcon,
  Minus,
  Undo,
  Redo,
  Trash,
  Copy,
  Image,
  MoreHorizontal,
  GitBranch,
  FileText,
  Link
} from 'lucide-react';
import React from 'react';

export const createIcon = (svg: React.ReactNode) => {
  return svg;
};

export const HandIcon = createIcon(
<Pointer />
);

export const SelectionIcon = createIcon(
<MousePointer />
);

export const MindIcon = createIcon(
<Waypoints />
);

export const ShapeIcon = createIcon(
<Shapes />
);

export const TextIcon = createIcon(
<Type />
);

export const EraseIcon = createIcon(
<Eraser />
);

export const StraightArrowLineIcon = createIcon(
  <ArrowRight />
);

export const RectangleIcon = createIcon(
  <Square />
);

export const TerminalIcon = createIcon(
  <Terminal />
);

export const EllipseIcon = createIcon(
  <Circle />
);

export const TriangleIcon = createIcon(
  <Triangle />
);

export const DiamondIcon = createIcon(
  <Diamond />
);

export const ParallelogramIcon = createIcon(
  <Square />
);

export const RoundRectangleIcon = createIcon(
  <Square />
);

export const StraightArrowIcon = createIcon(
  <ArrowRight />
);

export const ElbowArrowIcon = createIcon(
  <CornerDownRight />
);

export const CurveArrowIcon = createIcon(
  <ArrowRight />
);

export const MenuIcon = createIcon(
  <Menu />
);

export const GithubIcon = createIcon(
  <Github />
);

export const ExportImageIcon = createIcon(
  <Download />
);

export const ZoomOutIcon = createIcon(
  <ZoomOut />
);

export const ZoomInIcon = createIcon(
  <ZoomIn />
);

export const SaveFileIcon = createIcon(
  <Save />
);

export const OpenFileIcon = createIcon(
  <FolderOpen />
);

export const BackgroundColorIcon = createIcon(
  <Palette />
);

export const NoColorIcon = createIcon(
  <X />
);

export const Check = createIcon(
  <CheckIcon />
);

export const StrokeIcon = createIcon(
  <Circle />
);

export const StrokeWhiteIcon = createIcon(
  <Circle />
);

export const StrokeStyleNormalIcon = createIcon(
  <Minus />
);

export const StrokeStyleDashedIcon = createIcon(
  <Minus />
);

export const StrokeStyleDotedIcon = createIcon(
  <Circle />
);

export const FontColorIcon: React.FC<{ currentColor?: string }> = ({
  currentColor,
}) => {
  return (
    <div className="font-color-icon" style={{ position: 'relative' }}>
      <Type />
      <div 
        style={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          height: '2px', 
          backgroundColor: currentColor || '#333333' 
        }} 
      />
    </div>
  );
};

export const UndoIcon = createIcon(
  <Undo />
);

export const RedoIcon = createIcon(
  <Redo />
);

export const TrashIcon = createIcon(
  <Trash />
);

export const DuplicateIcon = createIcon(
  <Copy />
);

export const FeltTipPenIcon = createIcon(
  <PenTool />
);

export const ImageIcon = createIcon(
  <Image />
);

export const ExtraToolsIcon = createIcon(
  <MoreHorizontal />
);

export const MermaidLogoIcon = createIcon(
  <GitBranch />
);

export const MarkdownLogoIcon = createIcon(
  <FileText />
);

export const LinkIcon = createIcon(
  <Link />
);


export const ArrowIcon = createIcon(
  <ArrowRight />
);

export const LineIcon = createIcon(
  <Minus />
);

export const StraightLineIcon = createIcon(
  <Minus />
);
