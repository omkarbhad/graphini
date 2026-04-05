/**
 * Base theme system inspired by mermaid's theme architecture
 * Provides comprehensive color management for all diagram types
 */

import {
  adjustColor,
  darken,
  generateFillTypes,
  generateGitColors,
  generatePieColors,
  generateQuadrantColors,
  generateSurfaceColors,
  invert,
  lighten
} from '$lib/util/color';

export const THEME_COLOR_LIMIT = 12;

export interface ThemeColors {
  // Base colors
  background: string;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  primaryBorderColor: string;
  secondaryBorderColor: string;
  tertiaryBorderColor: string;
  primaryTextColor: string;
  secondaryTextColor: string;
  tertiaryTextColor: string;
  lineColor: string;
  textColor: string;

  // Main colors
  mainBkg: string;
  secondBkg: string;
  border1: string;
  border2: string;
  arrowheadColor: string;
  fontFamily: string;
  fontSize: string;
  labelBackground: string;

  // Additional helper colors
  mainContrastColor?: string;
  darkTextColor?: string;
  scaleLabelColor?: string;
  THEME_COLOR_LIMIT?: number;

  // Dark mode specific enhancements
  edgeGlowColor?: string;
  nodeShadowColor?: string;

  // Flowchart variables
  nodeBkg: string;
  nodeBorder: string;
  clusterBkg: string;
  clusterBorder: string;
  defaultLinkColor: string;
  titleColor: string;
  edgeLabelBackground: string;

  // Sequence Diagram variables
  actorBorder: string;
  actorBkg: string;
  actorTextColor: string;
  actorLineColor: string;
  signalColor: string;
  signalTextColor: string;
  labelBoxBkgColor: string;
  labelBoxBorderColor: string;
  labelTextColor: string;
  loopTextColor: string;
  noteBorderColor: string;
  noteBkgColor: string;
  noteTextColor: string;
  activationBorderColor: string;
  activationBkgColor: string;
  sequenceNumberColor: string;

  // Gantt chart variables
  sectionBkgColor: string;
  altSectionBkgColor: string;
  sectionBkgColor2: string;
  excludeBkgColor: string;
  taskBorderColor: string;
  taskBkgColor: string;
  taskTextLightColor: string;
  taskTextColor: string;
  taskTextDarkColor: string;
  taskTextOutsideColor: string;
  taskTextClickableColor: string;
  activeTaskBorderColor: string;
  activeTaskBkgColor: string;
  gridColor: string;
  doneTaskBkgColor: string;
  doneTaskBorderColor: string;
  critBorderColor: string;
  critBkgColor: string;
  todayLineColor: string;
  vertLineColor: string;

  // C4 Context Diagram variables
  personBorder: string;
  personBkg: string;

  // Architecture Diagram variables
  archEdgeColor: string;
  archEdgeArrowColor: string;
  archEdgeWidth: string;
  archGroupBorderColor: string;
  archGroupBorderWidth: string;

  // Entity Relationship variables
  rowOdd: string;
  rowEven: string;

  // State colors
  labelColor: string;
  errorBkgColor: string;
  errorTextColor: string;
  transitionColor: string;
  transitionLabelColor: string;
  stateLabelColor: string;
  stateBkg: string;
  labelBackgroundColor: string;
  compositeBackground: string;
  altBackground: string;
  compositeTitleBackground: string;
  compositeBorder: string;
  innerEndBackground: string;
  specialStateColor: string;

  // Class diagram
  classText: string;

  // Journey diagram
  fillType0: string;
  fillType1: string;
  fillType2: string;
  fillType3: string;
  fillType4: string;
  fillType5: string;
  fillType6: string;
  fillType7: string;

  // Pie diagram
  pie1: string;
  pie2: string;
  pie3: string;
  pie4: string;
  pie5: string;
  pie6: string;
  pie7: string;
  pie8: string;
  pie9: string;
  pie10: string;
  pie11: string;
  pie12: string;
  pieTitleTextSize: string;
  pieTitleTextColor: string;
  pieSectionTextSize: string;
  pieSectionTextColor: string;
  pieLegendTextSize: string;
  pieLegendTextColor: string;
  pieStrokeColor: string;
  pieStrokeWidth: string;
  pieOuterStrokeWidth: string;
  pieOuterStrokeColor: string;
  pieOpacity: string;

  // Quadrant graph
  quadrant1Fill: string;
  quadrant2Fill: string;
  quadrant3Fill: string;
  quadrant4Fill: string;
  quadrant1TextFill: string;
  quadrant2TextFill: string;
  quadrant3TextFill: string;
  quadrant4TextFill: string;
  quadrantPointFill: string;
  quadrantPointTextFill: string;
  quadrantXAxisTextFill: string;
  quadrantYAxisTextFill: string;
  quadrantInternalBorderStrokeFill: string;
  quadrantExternalBorderStrokeFill: string;
  quadrantTitleFill: string;

  // Requirement diagram
  requirementBackground: string;
  requirementBorderColor: string;
  requirementBorderSize: string;
  requirementTextColor: string;
  relationColor: string;
  relationLabelBackground: string;
  relationLabelColor: string;

  // Git graph
  git0: string;
  git1: string;
  git2: string;
  git3: string;
  git4: string;
  git5: string;
  git6: string;
  git7: string;
  gitInv0: string;
  gitInv1: string;
  gitInv2: string;
  gitInv3: string;
  gitInv4: string;
  gitInv5: string;
  gitInv6: string;
  gitInv7: string;
  gitBranchLabel0: string;
  gitBranchLabel1: string;
  gitBranchLabel2: string;
  gitBranchLabel3: string;
  gitBranchLabel4: string;
  gitBranchLabel5: string;
  gitBranchLabel6: string;
  gitBranchLabel7: string;
  tagLabelColor: string;
  tagLabelBackground: string;
  tagLabelBorder: string;
  tagLabelFontSize: string;
  commitLabelColor: string;
  commitLabelBackground: string;
  commitLabelFontSize: string;

  // Color scale (dynamic)
  [key: `cScale${number}`]: string;
  [key: `cScalePeer${number}`]: string;
  [key: `cScaleInv${number}`]: string;
  [key: `cScaleLabel${number}`]: string;
  [key: `surface${number}`]: string;
  [key: `surfacePeer${number}`]: string;

  // XY Chart
  xyChart: {
    backgroundColor: string;
    titleColor: string;
    xAxisTitleColor: string;
    xAxisLabelColor: string;
    xAxisTickColor: string;
    xAxisLineColor: string;
    yAxisTitleColor: string;
    yAxisLabelColor: string;
    yAxisTickColor: string;
    yAxisLineColor: string;
    plotColorPalette: string;
  };

  // Radar
  radar: {
    axisColor: string;
    axisStrokeWidth: number;
    axisLabelFontSize: number;
    curveOpacity: number;
    curveStrokeWidth: number;
    graticuleColor: string;
    graticuleStrokeWidth: number;
    graticuleOpacity: number;
    legendBoxSize: number;
    legendFontSize: number;
  };

  // Packet diagram
  packet: {
    startByteColor: string;
    endByteColor: string;
    labelColor: string;
    titleColor: string;
    blockStrokeColor: string;
    blockFillColor: string;
  };

  // Entity Relationship specific
  attributeBackgroundColorOdd: string;
  attributeBackgroundColorEven: string;

  // Dark mode flag
  darkMode: boolean;
}

export abstract class BaseTheme {
  protected darkMode = false;
  protected colors: Partial<ThemeColors> = {};

  constructor(darkMode = false) {
    this.darkMode = darkMode;
    this.initializeBaseColors();
    this.initializeDefaults();
  }

  protected initializeBaseColors(): void {
    // Override in subclasses
  }

  protected initializeDefaults(): void {
    // Common defaults
    this.colors.fontFamily = '"trebuchet ms", verdana, arial, sans-serif';
    this.colors.fontSize = '16px';
    this.colors.THEME_COLOR_LIMIT = THEME_COLOR_LIMIT;
    this.colors.darkMode = this.darkMode;

    // Default note colors
    this.colors.noteBkgColor = '#fff5ad';
    this.colors.sequenceNumberColor = 'black';

    // Default error colors
    this.colors.errorBkgColor = '#552222';
    this.colors.errorTextColor = '#552222';

    // Default requirement border size
    this.colors.requirementBorderSize = '1';

    // Default pie styling
    this.colors.pieTitleTextSize = '25px';
    this.colors.pieSectionTextSize = '17px';
    this.colors.pieLegendTextSize = '17px';
    this.colors.pieStrokeWidth = '2px';
    this.colors.pieOuterStrokeWidth = '2px';
    this.colors.pieOpacity = '0.7';

    // Default quadrant styling
    this.colors.quadrantPointTextFill = this.colors.primaryTextColor || this.colors.textColor;
    this.colors.quadrantXAxisTextFill = this.colors.primaryTextColor || this.colors.textColor;
    this.colors.quadrantYAxisTextFill = this.colors.primaryTextColor || this.colors.textColor;
    this.colors.quadrantInternalBorderStrokeFill = this.colors.primaryBorderColor;
    this.colors.quadrantExternalBorderStrokeFill = this.colors.primaryBorderColor;
    this.colors.quadrantTitleFill = this.colors.primaryTextColor || this.colors.textColor;

    // Default architecture styling
    this.colors.archEdgeWidth = '3';
    this.colors.archGroupBorderWidth = '2px';

    // Default tag and commit styling
    this.colors.tagLabelFontSize = '10px';
    this.colors.commitLabelFontSize = '10px';

    // Default radar styling
    this.colors.radar = {
      axisColor: this.colors.lineColor || '#333',
      axisStrokeWidth: 2,
      axisLabelFontSize: 12,
      curveOpacity: 0.5,
      curveStrokeWidth: 2,
      graticuleColor: '#DEDEDE',
      graticuleStrokeWidth: 1,
      graticuleOpacity: 0.3,
      legendBoxSize: 12,
      legendFontSize: 12
    };
  }

  protected updateColors(): void {
    // Generate color scale
    this.generateColorScale();

    // Generate surface colors
    this.generateSurfaceColors();

    // Update flowchart colors
    this.updateFlowchartColors();

    // Update sequence diagram colors
    this.updateSequenceColors();

    // Update Gantt colors
    this.updateGanttColors();

    // Update architecture colors
    this.updateArchitectureColors();

    // Update state colors
    this.updateStateColors();

    // Update journey colors
    this.updateJourneyColors();

    // Update pie colors
    this.updatePieColors();

    // Update quadrant colors
    this.updateQuadrantColors();

    // Update requirement colors
    this.updateRequirementColors();

    // Update git colors
    this.updateGitColors();

    // Update XY chart colors
    this.updateXYChartColors();

    // Update packet colors
    this.updatePacketColors();

    // Update entity relationship colors
    this.updateEntityRelationshipColors();
  }

  protected generateColorScale(): void {
    // Base colors for scale
    this.colors.cScale0 = this.colors.cScale0 || this.colors.primaryColor;
    this.colors.cScale1 = this.colors.cScale1 || this.colors.secondaryColor;
    this.colors.cScale2 = this.colors.cScale2 || this.colors.tertiaryColor;

    // Generate hue variations
    for (let i = 3; i < THEME_COLOR_LIMIT; i++) {
      const hueShift = (i - 2) * 30; // 90, 120, 150, 210, 270, 300, 330
      this.colors[`cScale${i}` as keyof ThemeColors] = adjustColor(this.colors.primaryColor!, {
        h: hueShift
      });
    }

    // Generate peer colors (for borders)
    for (let i = 0; i < THEME_COLOR_LIMIT; i++) {
      const baseColor = this.colors[`cScale${i}` as keyof ThemeColors];
      if (baseColor) {
        this.colors[`cScalePeer${i}` as keyof ThemeColors] = this.darkMode
          ? lighten(baseColor, 10)
          : darken(baseColor, 10);
      }
    }

    // Generate inverted colors
    for (let i = 0; i < THEME_COLOR_LIMIT; i++) {
      const baseColor = this.colors[`cScale${i}` as keyof ThemeColors];
      if (baseColor) {
        this.colors[`cScaleInv${i}` as keyof ThemeColors] = adjustColor(baseColor, { h: 180 });
      }
    }

    // Generate label colors
    const scaleLabelColor =
      this.colors.scaleLabelColor || this.colors.labelTextColor || this.colors.textColor;
    for (let i = 0; i < THEME_COLOR_LIMIT; i++) {
      this.colors[`cScaleLabel${i}` as keyof ThemeColors] = scaleLabelColor;
    }
  }

  protected generateSurfaceColors(): void {
    if (!this.colors.mainBkg) return;

    const surfaces = generateSurfaceColors(this.colors.mainBkg, this.darkMode);
    for (let i = 0; i < 5; i++) {
      this.colors[`surface${i}` as keyof ThemeColors] = surfaces[i];
      this.colors[`surfacePeer${i}` as keyof ThemeColors] = adjustColor(surfaces[i], {
        l: this.darkMode ? -3 : 3
      });
    }
  }

  protected updateFlowchartColors(): void {
    this.colors.nodeBkg = this.colors.nodeBkg || this.colors.mainBkg;
    this.colors.nodeBorder = this.colors.nodeBorder || this.colors.border1;
    this.colors.clusterBkg = this.colors.clusterBkg || this.colors.secondBkg;
    this.colors.clusterBorder = this.colors.clusterBorder || this.colors.border2;
    this.colors.defaultLinkColor = this.colors.defaultLinkColor || this.colors.lineColor;
    this.colors.titleColor = this.colors.titleColor || this.colors.textColor;
    this.colors.edgeLabelBackground =
      this.colors.edgeLabelBackground || this.colors.labelBackground;
  }

  protected updateSequenceColors(): void {
    this.colors.actorBorder = this.colors.actorBorder || this.colors.border1;
    this.colors.actorBkg = this.colors.actorBkg || this.colors.mainBkg;
    this.colors.actorTextColor =
      this.colors.actorTextColor || (this.darkMode ? this.colors.mainContrastColor : 'black');
    this.colors.actorLineColor = this.colors.actorLineColor || this.colors.actorBorder;
    this.colors.signalColor =
      this.colors.signalColor ||
      (this.darkMode ? this.colors.mainContrastColor : this.colors.textColor);
    this.colors.signalTextColor = this.colors.signalTextColor || this.colors.actorTextColor;
    this.colors.labelBoxBkgColor = this.colors.labelBoxBkgColor || this.colors.actorBkg;
    this.colors.labelBoxBorderColor = this.colors.labelBoxBorderColor || this.colors.actorBorder;
    this.colors.labelTextColor = this.colors.labelTextColor || this.colors.actorTextColor;
    this.colors.loopTextColor = this.colors.loopTextColor || this.colors.actorTextColor;
    this.colors.noteBorderColor = this.colors.noteBorderColor || this.colors.secondaryBorderColor;
    this.colors.noteBkgColor = this.colors.noteBkgColor || this.colors.secondBkg;
    this.colors.noteTextColor = this.colors.noteTextColor || this.colors.secondaryTextColor;
    this.colors.activationBorderColor = this.colors.activationBorderColor || this.colors.border1;
    this.colors.activationBkgColor = this.colors.activationBkgColor || this.colors.secondBkg;
  }

  protected updateGanttColors(): void {
    this.colors.altSectionBkgColor = this.colors.altSectionBkgColor || this.colors.background;
    this.colors.taskTextColor = this.colors.taskTextColor || this.colors.taskTextLightColor;
    this.colors.taskTextOutsideColor =
      this.colors.taskTextOutsideColor || this.colors.taskTextDarkColor;
    this.colors.gridColor =
      this.colors.gridColor ||
      (this.darkMode ? this.colors.mainContrastColor : this.colors.lineColor);
    this.colors.doneTaskBkgColor =
      this.colors.doneTaskBkgColor || (this.darkMode ? this.colors.mainContrastColor : 'lightgrey');
    this.colors.taskTextDarkColor =
      this.colors.taskTextDarkColor || (this.darkMode ? this.colors.darkTextColor : 'black');
  }

  protected updateArchitectureColors(): void {
    this.colors.archEdgeColor = this.colors.archEdgeColor || this.colors.lineColor;
    this.colors.archEdgeArrowColor = this.colors.archEdgeArrowColor || this.colors.lineColor;
  }

  protected updateStateColors(): void {
    this.colors.transitionColor = this.colors.transitionColor || this.colors.lineColor;
    this.colors.transitionLabelColor = this.colors.transitionLabelColor || this.colors.textColor;
    this.colors.stateLabelColor =
      this.colors.stateLabelColor || this.colors.stateBkg || this.colors.primaryTextColor;
    this.colors.stateBkg = this.colors.stateBkg || this.colors.mainBkg;
    this.colors.labelBackgroundColor = this.colors.labelBackgroundColor || this.colors.stateBkg;
    this.colors.compositeBackground =
      this.colors.compositeBackground || this.colors.background || this.colors.tertiaryColor;
    this.colors.altBackground = this.colors.altBackground || (this.darkMode ? '#555' : '#f0f0f0');
    this.colors.compositeTitleBackground =
      this.colors.compositeTitleBackground || this.colors.mainBkg;
    this.colors.compositeBorder = this.colors.compositeBorder || this.colors.nodeBorder;
    this.colors.innerEndBackground =
      this.colors.innerEndBackground || this.colors.primaryBorderColor;
    this.colors.specialStateColor = this.colors.specialStateColor || this.colors.lineColor;
    this.colors.errorBkgColor = this.colors.errorBkgColor || this.colors.tertiaryColor;
    this.colors.errorTextColor = this.colors.errorTextColor || this.colors.tertiaryTextColor;
  }

  protected updateJourneyColors(): void {
    if (!this.colors.primaryColor || !this.colors.secondaryColor) return;

    const fillTypes = generateFillTypes(this.colors.primaryColor, this.colors.secondaryColor);
    this.colors.fillType0 = fillTypes[0];
    this.colors.fillType1 = fillTypes[1];
    this.colors.fillType2 = fillTypes[2];
    this.colors.fillType3 = fillTypes[3];
    this.colors.fillType4 = fillTypes[4];
    this.colors.fillType5 = fillTypes[5];
    this.colors.fillType6 = fillTypes[6];
    this.colors.fillType7 = fillTypes[7];
  }

  protected updatePieColors(): void {
    if (!this.colors.primaryColor || !this.colors.secondaryColor || !this.colors.tertiaryColor)
      return;

    const pieColors = generatePieColors(
      this.colors.primaryColor,
      this.colors.secondaryColor,
      this.colors.tertiaryColor
    );
    this.colors.pie1 = pieColors[0];
    this.colors.pie2 = pieColors[1];
    this.colors.pie3 = pieColors[2];
    this.colors.pie4 = pieColors[3];
    this.colors.pie5 = pieColors[4];
    this.colors.pie6 = pieColors[5];
    this.colors.pie7 = pieColors[6];
    this.colors.pie8 = pieColors[7];
    this.colors.pie9 = pieColors[8];
    this.colors.pie10 = pieColors[9];
    this.colors.pie11 = pieColors[10];
    this.colors.pie12 = pieColors[11];

    this.colors.pieTitleTextColor = this.colors.pieTitleTextColor || this.colors.taskTextDarkColor;
    this.colors.pieSectionTextColor = this.colors.pieSectionTextColor || this.colors.textColor;
    this.colors.pieLegendTextColor =
      this.colors.pieLegendTextColor || this.colors.taskTextDarkColor;
    this.colors.pieStrokeColor = this.colors.pieStrokeColor || 'black';
    this.colors.pieOuterStrokeColor = this.colors.pieOuterStrokeColor || 'black';
  }

  protected updateQuadrantColors(): void {
    if (!this.colors.primaryColor || !this.colors.primaryTextColor) return;

    const quadrantColors = generateQuadrantColors(
      this.colors.primaryColor,
      this.colors.primaryTextColor
    );
    this.colors.quadrant1Fill = quadrantColors.fills[0];
    this.colors.quadrant2Fill = quadrantColors.fills[1];
    this.colors.quadrant3Fill = quadrantColors.fills[2];
    this.colors.quadrant4Fill = quadrantColors.fills[3];
    this.colors.quadrant1TextFill = quadrantColors.textFills[0];
    this.colors.quadrant2TextFill = quadrantColors.textFills[1];
    this.colors.quadrant3TextFill = quadrantColors.textFills[2];
    this.colors.quadrant4TextFill = quadrantColors.textFills[3];
    this.colors.quadrantPointFill = quadrantColors.pointFill;
  }

  protected updateRequirementColors(): void {
    this.colors.requirementBackground =
      this.colors.requirementBackground || this.colors.primaryColor;
    this.colors.requirementBorderColor =
      this.colors.requirementBorderColor || this.colors.primaryBorderColor;
    this.colors.requirementTextColor =
      this.colors.requirementTextColor || this.colors.primaryTextColor;
    this.colors.relationColor = this.colors.relationColor || this.colors.lineColor;
    this.colors.relationLabelBackground =
      this.colors.relationLabelBackground ||
      (this.darkMode ? darken(this.colors.secondaryColor!, 30) : this.colors.secondaryColor);
    this.colors.relationLabelColor = this.colors.relationLabelColor || this.colors.actorTextColor;
  }

  protected updateGitColors(): void {
    if (!this.colors.primaryColor || !this.colors.secondaryColor || !this.colors.tertiaryColor)
      return;

    const gitColors = generateGitColors(
      this.colors.primaryColor,
      this.colors.secondaryColor,
      this.colors.tertiaryColor,
      this.darkMode
    );
    this.colors.git0 = gitColors[0];
    this.colors.git1 = gitColors[1];
    this.colors.git2 = gitColors[2];
    this.colors.git3 = gitColors[3];
    this.colors.git4 = gitColors[4];
    this.colors.git5 = gitColors[5];
    this.colors.git6 = gitColors[6];
    this.colors.git7 = gitColors[7];

    // Generate inverted git colors
    for (let i = 0; i < 8; i++) {
      const gitColor = gitColors[i];
      this.colors[`gitInv${i}` as keyof ThemeColors] =
        i === 0 ? darken(invert(gitColor), 25) : invert(gitColor);
    }

    // Generate branch label colors
    const labelTextColor = this.colors.labelTextColor || this.colors.textColor;
    for (let i = 0; i < 8; i++) {
      this.colors[`gitBranchLabel${i}` as keyof ThemeColors] =
        i % 2 === 0 ? invert(labelTextColor) : labelTextColor;
    }

    this.colors.tagLabelColor = this.colors.tagLabelColor || this.colors.primaryTextColor;
    this.colors.tagLabelBackground = this.colors.tagLabelBackground || this.colors.primaryColor;
    this.colors.tagLabelBorder = this.colors.tagLabelBorder || this.colors.primaryBorderColor;
    this.colors.commitLabelColor = this.colors.commitLabelColor || this.colors.secondaryTextColor;
    this.colors.commitLabelBackground =
      this.colors.commitLabelBackground || this.colors.secondaryColor;
  }

  protected updateXYChartColors(): void {
    this.colors.xyChart = {
      backgroundColor: this.colors.xyChart?.backgroundColor || this.colors.background,
      titleColor: this.colors.xyChart?.titleColor || this.colors.primaryTextColor,
      xAxisTitleColor: this.colors.xyChart?.xAxisTitleColor || this.colors.primaryTextColor,
      xAxisLabelColor: this.colors.xyChart?.xAxisLabelColor || this.colors.primaryTextColor,
      xAxisTickColor: this.colors.xyChart?.xAxisTickColor || this.colors.primaryTextColor,
      xAxisLineColor: this.colors.xyChart?.xAxisLineColor || this.colors.primaryTextColor,
      yAxisTitleColor: this.colors.xyChart?.yAxisTitleColor || this.colors.primaryTextColor,
      yAxisLabelColor: this.colors.xyChart?.yAxisLabelColor || this.colors.primaryTextColor,
      yAxisTickColor: this.colors.xyChart?.yAxisTickColor || this.colors.primaryTextColor,
      yAxisLineColor: this.colors.xyChart?.yAxisLineColor || this.colors.primaryTextColor,
      plotColorPalette:
        this.colors.xyChart?.plotColorPalette ||
        (this.darkMode
          ? '#3498db,#2ecc71,#e74c3c,#f1c40f,#bdc3c7,#ffffff,#34495e,#9b59b6,#1abc9c,#e67e22'
          : '#ECECFF,#8493A6,#FFC3A0,#DCDDE1,#B8E994,#D1A36F,#C3CDE6,#FFB6C1,#496078,#F8F3E3')
    };
  }

  protected updatePacketColors(): void {
    this.colors.packet = {
      startByteColor: this.colors.packet?.startByteColor || this.colors.primaryTextColor,
      endByteColor: this.colors.packet?.endByteColor || this.colors.primaryTextColor,
      labelColor: this.colors.packet?.labelColor || this.colors.primaryTextColor,
      titleColor: this.colors.packet?.titleColor || this.colors.primaryTextColor,
      blockStrokeColor: this.colors.packet?.blockStrokeColor || this.colors.primaryTextColor,
      blockFillColor: this.colors.packet?.blockFillColor || this.colors.background
    };
  }

  protected updateEntityRelationshipColors(): void {
    this.colors.rowOdd =
      this.colors.rowOdd || (this.darkMode ? lighten(this.colors.mainBkg!, 5) : '#ffffff');
    this.colors.rowEven =
      this.colors.rowEven ||
      (this.darkMode ? darken(this.colors.mainBkg!, 10) : lighten(this.colors.primaryColor!, 1));
    this.colors.attributeBackgroundColorOdd =
      this.colors.attributeBackgroundColorOdd ||
      (this.darkMode
        ? lighten(this.colors.background!, 12)
        : lighten(this.colors.primaryColor!, 75));
    this.colors.attributeBackgroundColorEven =
      this.colors.attributeBackgroundColorEven ||
      (this.darkMode ? lighten(this.colors.background!, 2) : lighten(this.colors.primaryColor!, 1));
  }

  public calculate(overrides: Partial<ThemeColors> = {}): ThemeColors {
    // Reset calculated values
    Object.keys(this.colors).forEach((key) => {
      if (this.colors[key as keyof ThemeColors] === 'calculated') {
        delete this.colors[key as keyof ThemeColors];
      }
    });

    // Apply overrides
    Object.assign(this.colors, overrides);

    // Update colors
    this.updateColors();

    // Apply final overrides (for derived values)
    Object.assign(this.colors, overrides);

    return this.colors as ThemeColors;
  }
}
