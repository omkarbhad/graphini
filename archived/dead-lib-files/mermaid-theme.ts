/**
 * Mermaid theme integration with our color system
 * Converts our theme colors to Mermaid's theme configuration
 */

import type { ThemeColors } from '$lib/themes';
import { themeToCSSVariables } from '$lib/themes';

/**
 * Convert our theme to Mermaid theme configuration
 */
export function themeToMermaidConfig(theme: ThemeColors): Record<string, any> {
  return {
    // Base theme configuration
    theme: 'base',
    themeVariables: {
      // Base colors
      primaryColor: theme.primaryColor,
      primaryTextColor: theme.primaryTextColor,
      primaryBorderColor: theme.primaryBorderColor,
      lineColor: theme.lineColor,
      textColor: theme.textColor,
      secondaryColor: theme.secondaryColor,
      secondaryTextColor: theme.secondaryTextColor,
      secondaryBorderColor: theme.secondaryBorderColor,
      tertiaryColor: theme.tertiaryColor,
      tertiaryTextColor: theme.tertiaryTextColor,
      tertiaryBorderColor: theme.tertiaryBorderColor,
      background: theme.background,
      mainBkg: theme.mainBkg,
      secondBkg: theme.secondBkg,
      border1: theme.border1,
      border2: theme.border2,

      // Flowchart specific
      nodeBkg: theme.nodeBkg,
      nodeBorder: theme.nodeBorder,
      clusterBkg: theme.clusterBkg,
      clusterBorder: theme.clusterBorder,
      defaultLinkColor: theme.defaultLinkColor,
      edgeLabelBackground: theme.edgeLabelBackground,
      titleColor: theme.titleColor,

      // Sequence diagram specific
      actorBorder: theme.actorBorder,
      actorBkg: theme.actorBkg,
      actorTextColor: theme.actorTextColor,
      actorLineColor: theme.actorLineColor,
      signalColor: theme.signalColor,
      signalTextColor: theme.signalTextColor,
      labelBoxBkgColor: theme.labelBoxBkgColor,
      labelBoxBorderColor: theme.labelBoxBorderColor,
      labelTextColor: theme.labelTextColor,
      loopTextColor: theme.loopTextColor,
      noteBorderColor: theme.noteBorderColor,
      noteBkgColor: theme.noteBkgColor,
      noteTextColor: theme.noteTextColor,
      activationBorderColor: theme.activationBorderColor,
      activationBkgColor: theme.activationBkgColor,
      sequenceNumberColor: theme.sequenceNumberColor,

      // Gantt chart specific
      sectionBkgColor: theme.sectionBkgColor,
      altSectionBkgColor: theme.altSectionBkgColor,
      sectionBkgColor2: theme.sectionBkgColor2,
      excludeBkgColor: theme.excludeBkgColor,
      taskBorderColor: theme.taskBorderColor,
      taskBkgColor: theme.taskBkgColor,
      taskTextLightColor: theme.taskTextLightColor,
      taskTextColor: theme.taskTextColor,
      taskTextDarkColor: theme.taskTextDarkColor,
      taskTextOutsideColor: theme.taskTextOutsideColor,
      taskTextClickableColor: theme.taskTextClickableColor,
      activeTaskBorderColor: theme.activeTaskBorderColor,
      activeTaskBkgColor: theme.activeTaskBkgColor,
      gridColor: theme.gridColor,
      doneTaskBkgColor: theme.doneTaskBkgColor,
      doneTaskBorderColor: theme.doneTaskBorderColor,
      critBorderColor: theme.critBorderColor,
      critBkgColor: theme.critBkgColor,
      todayLineColor: theme.todayLineColor,
      vertLineColor: theme.vertLineColor,

      // Class diagram specific
      classText: theme.classText,

      // State diagram specific
      labelColor: theme.labelColor,
      errorBkgColor: theme.errorBkgColor,
      errorTextColor: theme.errorTextColor,
      transitionColor: theme.transitionColor,
      transitionLabelColor: theme.transitionLabelColor,
      stateLabelColor: theme.stateLabelColor,
      stateBkg: theme.stateBkg,
      labelBackgroundColor: theme.labelBackgroundColor,
      compositeBackground: theme.compositeBackground,
      altBackground: theme.altBackground,
      compositeTitleBackground: theme.compositeTitleBackground,
      compositeBorder: theme.compositeBorder,
      innerEndBackground: theme.innerEndBackground,
      specialStateColor: theme.specialStateColor,

      // Journey diagram specific
      fillType0: theme.fillType0,
      fillType1: theme.fillType1,
      fillType2: theme.fillType2,
      fillType3: theme.fillType3,
      fillType4: theme.fillType4,
      fillType5: theme.fillType5,
      fillType6: theme.fillType6,
      fillType7: theme.fillType7,

      // Pie chart specific
      pie1: theme.pie1,
      pie2: theme.pie2,
      pie3: theme.pie3,
      pie4: theme.pie4,
      pie5: theme.pie5,
      pie6: theme.pie6,
      pie7: theme.pie7,
      pie8: theme.pie8,
      pie9: theme.pie9,
      pie10: theme.pie10,
      pie11: theme.pie11,
      pie12: theme.pie12,
      pieTitleTextSize: theme.pieTitleTextSize,
      pieTitleTextColor: theme.pieTitleTextColor,
      pieSectionTextSize: theme.pieSectionTextSize,
      pieSectionTextColor: theme.pieSectionTextColor,
      pieLegendTextSize: theme.pieLegendTextSize,
      pieLegendTextColor: theme.pieLegendTextColor,
      pieStrokeColor: theme.pieStrokeColor,
      pieStrokeWidth: theme.pieStrokeWidth,
      pieOuterStrokeWidth: theme.pieOuterStrokeWidth,
      pieOuterStrokeColor: theme.pieOuterStrokeColor,
      pieOpacity: theme.pieOpacity,

      // Quadrant chart specific
      quadrant1Fill: theme.quadrant1Fill,
      quadrant2Fill: theme.quadrant2Fill,
      quadrant3Fill: theme.quadrant3Fill,
      quadrant4Fill: theme.quadrant4Fill,
      quadrant1TextFill: theme.quadrant1TextFill,
      quadrant2TextFill: theme.quadrant2TextFill,
      quadrant3TextFill: theme.quadrant3TextFill,
      quadrant4TextFill: theme.quadrant4TextFill,
      quadrantPointFill: theme.quadrantPointFill,
      quadrantPointTextFill: theme.quadrantPointTextFill,
      quadrantXAxisTextFill: theme.quadrantXAxisTextFill,
      quadrantYAxisTextFill: theme.quadrantYAxisTextFill,
      quadrantInternalBorderStrokeFill: theme.quadrantInternalBorderStrokeFill,
      quadrantExternalBorderStrokeFill: theme.quadrantExternalBorderStrokeFill,
      quadrantTitleFill: theme.quadrantTitleFill,

      // Requirement diagram specific
      requirementBackground: theme.requirementBackground,
      requirementBorderColor: theme.requirementBorderColor,
      requirementBorderSize: theme.requirementBorderSize,
      requirementTextColor: theme.requirementTextColor,
      relationColor: theme.relationColor,
      relationLabelBackground: theme.relationLabelBackground,
      relationLabelColor: theme.relationLabelColor,

      // Git graph specific
      git0: theme.git0,
      git1: theme.git1,
      git2: theme.git2,
      git3: theme.git3,
      git4: theme.git4,
      git5: theme.git5,
      git6: theme.git6,
      git7: theme.git7,
      gitInv0: theme.gitInv0,
      gitInv1: theme.gitInv1,
      gitInv2: theme.gitInv2,
      gitInv3: theme.gitInv3,
      gitInv4: theme.gitInv4,
      gitInv5: theme.gitInv5,
      gitInv6: theme.gitInv6,
      gitInv7: theme.gitInv7,
      gitBranchLabel0: theme.gitBranchLabel0,
      gitBranchLabel1: theme.gitBranchLabel1,
      gitBranchLabel2: theme.gitBranchLabel2,
      gitBranchLabel3: theme.gitBranchLabel3,
      gitBranchLabel4: theme.gitBranchLabel4,
      gitBranchLabel5: theme.gitBranchLabel5,
      gitBranchLabel6: theme.gitBranchLabel6,
      gitBranchLabel7: theme.gitBranchLabel7,
      tagLabelColor: theme.tagLabelColor,
      tagLabelBackground: theme.tagLabelBackground,
      tagLabelBorder: theme.tagLabelBorder,
      tagLabelFontSize: theme.tagLabelFontSize,
      commitLabelColor: theme.commitLabelColor,
      commitLabelBackground: theme.commitLabelBackground,
      commitLabelFontSize: theme.commitLabelFontSize,

      // C4 Context diagram specific
      personBorder: theme.personBorder,
      personBkg: theme.personBkg,

      // Architecture diagram specific
      archEdgeColor: theme.archEdgeColor,
      archEdgeArrowColor: theme.archEdgeArrowColor,
      archEdgeWidth: theme.archEdgeWidth,
      archGroupBorderColor: theme.archGroupBorderColor,
      archGroupBorderWidth: theme.archGroupBorderWidth,

      // Entity Relationship specific
      rowOdd: theme.rowOdd,
      rowEven: theme.rowEven,
      attributeBackgroundColorOdd: theme.attributeBackgroundColorOdd,
      attributeBackgroundColorEven: theme.attributeBackgroundColorEven,

      // Color scale (cScale0 to cScale11)
      ...Object.fromEntries(
        Array.from({ length: 12 }, (_, i) => [
          `cScale${i}`,
          theme[`cScale${i}` as keyof ThemeColors]
        ])
      ),

      // Peer colors (cScalePeer0 to cScalePeer11)
      ...Object.fromEntries(
        Array.from({ length: 12 }, (_, i) => [
          `cScalePeer${i}`,
          theme[`cScalePeer${i}` as keyof ThemeColors]
        ])
      ),

      // Label colors (cScaleLabel0 to cScaleLabel11)
      ...Object.fromEntries(
        Array.from({ length: 12 }, (_, i) => [
          `cScaleLabel${i}`,
          theme[`cScaleLabel${i}` as keyof ThemeColors]
        ])
      ),

      // Surface colors (surface0 to surface4)
      ...Object.fromEntries(
        Array.from({ length: 5 }, (_, i) => [
          `surface${i}`,
          theme[`surface${i}` as keyof ThemeColors]
        ])
      ),

      // XY Chart specific
      xyChartBackgroundColor: theme.xyChart?.backgroundColor,
      xyChartTitleColor: theme.xyChart?.titleColor,
      xyChartXAxisTitleColor: theme.xyChart?.xAxisTitleColor,
      xyChartXAxisLabelColor: theme.xyChart?.xAxisLabelColor,
      xyChartXAxisTickColor: theme.xyChart?.xAxisTickColor,
      xyChartXAxisLineColor: theme.xyChart?.xAxisLineColor,
      xyChartYAxisTitleColor: theme.xyChart?.yAxisTitleColor,
      xyChartYAxisLabelColor: theme.xyChart?.yAxisLabelColor,
      xyChartYAxisTickColor: theme.xyChart?.yAxisTickColor,
      xyChartYAxisLineColor: theme.xyChart?.yAxisLineColor,
      xyChartPlotColorPalette: theme.xyChart?.plotColorPalette,

      // Radar chart specific
      radarAxisColor: theme.radar?.axisColor,
      radarAxisStrokeWidth: theme.radar?.axisStrokeWidth,
      radarAxisLabelFontSize: theme.radar?.axisLabelFontSize,
      radarCurveOpacity: theme.radar?.curveOpacity,
      radarCurveStrokeWidth: theme.radar?.curveStrokeWidth,
      radarGraticuleColor: theme.radar?.graticuleColor,
      radarGraticuleStrokeWidth: theme.radar?.graticuleStrokeWidth,
      radarGraticuleOpacity: theme.radar?.graticuleOpacity,
      radarLegendBoxSize: theme.radar?.legendBoxSize,
      radarLegendFontSize: theme.radar?.legendFontSize,

      // Packet diagram specific
      packetStartByteColor: theme.packet?.startByteColor,
      packetEndByteColor: theme.packet?.endByteColor,
      packetLabelColor: theme.packet?.labelColor,
      packetTitleColor: theme.packet?.titleColor,
      packetBlockStrokeColor: theme.packet?.blockStrokeColor,
      packetBlockFillColor: theme.packet?.blockFillColor
    },

    // Font settings
    fontFamily: theme.fontFamily,
    fontSize: theme.fontSize
  };
}

/**
 * Generate CSS for Mermaid diagram styling
 */
export function generateMermaidCSS(theme: ThemeColors): string {
  const cssVars = themeToCSSVariables(theme);

  let css = `
/* Mermaid Theme CSS */
.mermaid {
  /* Base colors */
  --primary-color: ${theme.primaryColor};
  --primary-text-color: ${theme.primaryTextColor};
  --primary-border-color: ${theme.primaryBorderColor};
  --line-color: ${theme.lineColor};
  --text-color: ${theme.textColor};
  --secondary-color: ${theme.secondaryColor};
  --secondary-text-color: ${theme.secondaryTextColor};
  --secondary-border-color: ${theme.secondaryBorderColor};
  --tertiary-color: ${theme.tertiaryColor};
  --tertiary-text-color: ${theme.tertiaryTextColor};
  --tertiary-border-color: ${theme.tertiaryBorderColor};
  --background-color: ${theme.background};
  --main-bkg: ${theme.mainBkg};
  --second-bkg: ${theme.secondBkg};
  --border1: ${theme.border1};
  --border2: ${theme.border2};

  /* Typography */
  --font-family: ${theme.fontFamily};
  --font-size: ${theme.fontSize};
`;

  // Add color scale variables
  for (let i = 0; i < 12; i++) {
    const color = theme[`cScale${i}` as keyof ThemeColors];
    const peerColor = theme[`cScalePeer${i}` as keyof ThemeColors];
    const labelColor = theme[`cScaleLabel${i}` as keyof ThemeColors];

    if (typeof color === 'string') {
      css += `  --c-scale-${i}: ${color};\n`;
    }
    if (typeof peerColor === 'string') {
      css += `  --c-scale-peer-${i}: ${peerColor};\n`;
    }
    if (typeof labelColor === 'string') {
      css += `  --c-scale-label-${i}: ${labelColor};\n`;
    }
  }

  // Add surface colors
  for (let i = 0; i < 5; i++) {
    const surfaceColor = theme[`surface${i}` as keyof ThemeColors];
    if (typeof surfaceColor === 'string') {
      css += `  --surface-${i}: ${surfaceColor};\n`;
    }
  }

  css += `
  /* Node styling */
  .node rect,
  .node circle,
  .node ellipse,
  .node polygon {
    fill: var(--main-bkg);
    stroke: var(--border1);
    stroke-width: 2px;
  }

  .node text {
    fill: var(--primary-text-color);
    font-family: var(--font-family);
    font-size: var(--font-size);
  }

  /* Cluster styling */
  .cluster rect {
    fill: var(--second-bkg);
    stroke: var(--border2);
    stroke-width: 1px;
  }

  .cluster text {
    fill: var(--text-color);
  }

  /* Edge styling */
  .edgePath .path {
    stroke: var(--line-color);
    stroke-width: 2px;
  }

  .edgeLabel {
    background-color: var(--edge-label-background);
    fill: var(--text-color);
  }

  /* Sequence diagram actors */
  .actor {
    fill: var(--actor-bkg, var(--main-bkg));
    stroke: var(--actor-border, var(--border1));
    stroke-width: 2px;
  }

  .actor text {
    fill: var(--actor-text-color, var(--primary-text-color));
  }

  /* Sequence diagram messages */
  .messageLine0,
  .messageLine1 {
    stroke: var(--signal-color, var(--line-color));
    stroke-width: 2px;
  }

  /* Notes */
  .note {
    fill: var(--note-bkg-color, #fff5ad);
    stroke: var(--note-border-color, var(--border2));
    stroke-width: 1px;
  }

  .note text {
    fill: var(--note-text-color, var(--text-color));
  }

  /* Activation boxes */
  .activation {
    fill: var(--activation-bkg-color, var(--second-bkg));
    stroke: var(--activation-border-color, var(--border1));
    stroke-width: 1px;
  }

  /* Gantt chart styling */
  .task {
    fill: var(--task-bkg-color, var(--main-bkg));
    stroke: var(--task-border-color, var(--border1));
    stroke-width: 1px;
  }

  .task text {
    fill: var(--task-text-color, var(--text-color));
  }

  .active {
    fill: var(--active-task-bkg-color, var(--main-bkg));
    stroke: var(--active-task-border-color, var(--border1));
  }

  .done {
    fill: var(--done-task-bkg-color, var(--line-color));
    stroke: var(--done-task-border-color, var(--border2));
  }

  .crit {
    fill: var(--crit-bkg-color, #ff8888);
    stroke: var(--crit-border-color, #ff8888);
  }

  .today {
    fill: var(--today-line-color, red);
    stroke: var(--today-line-color, red);
  }

  /* State diagram styling */
  .state {
    fill: var(--state-bkg, var(--main-bkg));
    stroke: var(--border1);
    stroke-width: 1px;
  }

  .state text {
    fill: var(--state-label-color, var(--text-color));
  }

  .start {
    fill: var(--primary-color) !important;
  }

  .end {
    fill: var(--error-bkg-color, #552222) !important;
  }
`;

  return css;
}

/**
 * Apply theme to Mermaid instance
 */
export function applyThemeToMermaid(mermaid: any, theme: ThemeColors): void {
  const config = themeToMermaidConfig(theme);

  // Update Mermaid configuration
  if (mermaid && mermaid.initialize) {
    mermaid.initialize(config);
  } else if (mermaid && mermaid.config) {
    mermaid.config(config);
  }
}

/**
 * Get theme for specific diagram type
 */
export function getDiagramTheme(theme: ThemeColors, diagramType: string): Partial<ThemeColors> {
  switch (diagramType) {
    case 'flowchart':
    case 'flowchart-v2':
      return {
        nodeBkg: theme.nodeBkg,
        nodeBorder: theme.nodeBorder,
        clusterBkg: theme.clusterBkg,
        clusterBorder: theme.clusterBorder,
        defaultLinkColor: theme.defaultLinkColor,
        titleColor: theme.titleColor,
        edgeLabelBackground: theme.edgeLabelBackground
      };

    case 'sequence':
      return {
        actorBorder: theme.actorBorder,
        actorBkg: theme.actorBkg,
        actorTextColor: theme.actorTextColor,
        actorLineColor: theme.actorLineColor,
        signalColor: theme.signalColor,
        signalTextColor: theme.signalTextColor,
        labelBoxBkgColor: theme.labelBoxBkgColor,
        labelBoxBorderColor: theme.labelBoxBorderColor,
        labelTextColor: theme.labelTextColor,
        noteBorderColor: theme.noteBorderColor,
        noteBkgColor: theme.noteBkgColor,
        noteTextColor: theme.noteTextColor,
        activationBorderColor: theme.activationBorderColor,
        activationBkgColor: theme.activationBkgColor
      };

    case 'gantt':
      return {
        sectionBkgColor: theme.sectionBkgColor,
        altSectionBkgColor: theme.altSectionBkgColor,
        taskBorderColor: theme.taskBorderColor,
        taskBkgColor: theme.taskBkgColor,
        taskTextColor: theme.taskTextColor,
        activeTaskBorderColor: theme.activeTaskBorderColor,
        activeTaskBkgColor: theme.activeTaskBkgColor,
        gridColor: theme.gridColor,
        doneTaskBkgColor: theme.doneTaskBkgColor,
        critBorderColor: theme.critBorderColor,
        critBkgColor: theme.critBkgColor,
        todayLineColor: theme.todayLineColor
      };

    case 'state':
      return {
        labelColor: theme.labelColor,
        errorBkgColor: theme.errorBkgColor,
        errorTextColor: theme.errorTextColor,
        transitionColor: theme.transitionColor,
        transitionLabelColor: theme.transitionLabelColor,
        stateLabelColor: theme.stateLabelColor,
        stateBkg: theme.stateBkg,
        labelBackgroundColor: theme.labelBackgroundColor,
        compositeBackground: theme.compositeBackground,
        altBackground: theme.altBackground,
        compositeTitleBackground: theme.compositeTitleBackground,
        compositeBorder: theme.compositeBorder
      };

    case 'class':
      return {
        classText: theme.classText
      };

    case 'pie':
      return {
        pie1: theme.pie1,
        pie2: theme.pie2,
        pie3: theme.pie3,
        pie4: theme.pie4,
        pie5: theme.pie5,
        pie6: theme.pie6,
        pie7: theme.pie7,
        pie8: theme.pie8,
        pie9: theme.pie9,
        pie10: theme.pie10,
        pie11: theme.pie11,
        pie12: theme.pie12,
        pieTitleTextSize: theme.pieTitleTextSize,
        pieTitleTextColor: theme.pieTitleTextColor,
        pieSectionTextSize: theme.pieSectionTextSize,
        pieSectionTextColor: theme.pieSectionTextColor,
        pieLegendTextSize: theme.pieLegendTextSize,
        pieLegendTextColor: theme.pieLegendTextColor,
        pieStrokeColor: theme.pieStrokeColor,
        pieStrokeWidth: theme.pieStrokeWidth,
        pieOuterStrokeWidth: theme.pieOuterStrokeWidth,
        pieOuterStrokeColor: theme.pieOuterStrokeColor,
        pieOpacity: theme.pieOpacity
      };

    case 'git':
      return {
        git0: theme.git0,
        git1: theme.git1,
        git2: theme.git2,
        git3: theme.git3,
        git4: theme.git4,
        git5: theme.git5,
        git6: theme.git6,
        git7: theme.git7,
        gitInv0: theme.gitInv0,
        gitInv1: theme.gitInv1,
        gitInv2: theme.gitInv2,
        gitInv3: theme.gitInv3,
        gitInv4: theme.gitInv4,
        gitInv5: theme.gitInv5,
        gitInv6: theme.gitInv6,
        gitInv7: theme.gitInv7,
        tagLabelColor: theme.tagLabelColor,
        tagLabelBackground: theme.tagLabelBackground,
        tagLabelBorder: theme.tagLabelBorder,
        commitLabelColor: theme.commitLabelColor,
        commitLabelBackground: theme.commitLabelBackground
      };

    default:
      return theme;
  }
}
