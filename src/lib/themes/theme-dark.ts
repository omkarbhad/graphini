/**
 * Dark theme implementation
 */

import { darken, lighten, rgba } from '$lib/util/color';
import { BaseTheme, type ThemeColors } from './theme-base';

export class DarkTheme extends BaseTheme {
  protected initializeBaseColors(): void {
    // Base colors - improved for better visibility
    this.colors.background = '#1e1e2e';
    this.colors.primaryColor = '#3b82f6';
    this.colors.secondaryColor = '#8b5cf6';
    this.colors.tertiaryColor = '#06b6d4';

    // Text colors - high contrast for dark backgrounds
    this.colors.primaryTextColor = '#ffffff';
    this.colors.secondaryTextColor = '#f1f5f9';
    this.colors.tertiaryTextColor = '#e2e8f0';
    this.colors.textColor = '#e2e8f0';
    this.colors.mainContrastColor = '#f8fafc';
    this.colors.darkTextColor = '#1e293b';

    // Border colors - visible on dark backgrounds
    this.colors.primaryBorderColor = '#60a5fa';
    this.colors.secondaryBorderColor = '#a78bfa';
    this.colors.tertiaryBorderColor = '#22d3ee';

    // Main colors - improved contrast
    this.colors.mainBkg = '#2d3748';
    this.colors.secondBkg = '#374151';
    this.colors.lineColor = '#94a3b8';
    this.colors.border1 = '#60a5fa';
    this.colors.border2 = '#a78bfa';
    this.colors.arrowheadColor = '#94a3b8';
    this.colors.labelBackground = '#1e293b';

    // Gantt specific colors
    this.colors.sectionBkgColor = darken('#EAE8D9', 30);
    this.colors.sectionBkgColor2 = '#EAE8D9';
    this.colors.excludeBkgColor = darken(this.colors.sectionBkgColor!, 10);
    this.colors.taskBorderColor = 'rgba(255, 255, 255, 70)';
    this.colors.taskTextClickableColor = '#003163';
    this.colors.activeTaskBorderColor = 'rgba(255, 255, 255, 50)';
    this.colors.activeTaskBkgColor = '#81B1DB';
    this.colors.critBorderColor = '#E83737';
    this.colors.critBkgColor = '#E83737';
    this.colors.todayLineColor = '#DB5757';
    this.colors.vertLineColor = '#00BFFF';

    // C4 colors
    this.colors.personBorder = this.colors.primaryBorderColor;
    this.colors.personBkg = this.colors.mainBkg;

    // State colors
    this.colors.labelColor = 'calculated';
    this.colors.errorBkgColor = '#a44141';
    this.colors.errorTextColor = '#ddd';

    // Entity relationship
    this.colors.rowOdd = lighten(this.colors.mainBkg!, 5);
    this.colors.rowEven = darken(this.colors.mainBkg!, 10);
  }

  protected updateColors(): void {
    super.updateColors();

    // Dark theme specific calculations
    this.colors.secondBkg = lighten(this.colors.mainBkg!, 16);
    this.colors.lineColor = this.colors.mainContrastColor!;
    this.colors.arrowheadColor = this.colors.mainContrastColor!;

    this.updateFlowchartColors();
    this.updateSequenceColors();
    this.updateStateColors();
    this.updateGanttColors();

    // Enhanced dark mode edge and text optimizations
    this.optimizeDarkModeEdges();
    this.optimizeDarkModeText();
  }

  protected optimizeDarkModeEdges(): void {
    // Ensure edges are visible in dark mode with higher contrast
    this.colors.nodeBorder = this.colors.nodeBorder || lighten(this.colors.border1!, 15);
    this.colors.clusterBorder = this.colors.clusterBorder || lighten(this.colors.border2!, 20);
    this.colors.defaultLinkColor = this.colors.defaultLinkColor || this.colors.mainContrastColor!;

    // Add subtle glow effects for better visibility
    this.colors.edgeGlowColor = this.colors.edgeGlowColor || rgba(this.colors.lineColor!, 0.3);
    this.colors.nodeShadowColor = this.colors.nodeShadowColor || 'rgba(0, 0, 0, 0.5)';

    // Ensure borders have sufficient contrast
    this.colors.border1 = this.colors.border1 || lighten(this.colors.primaryBorderColor!, 10);
    this.colors.border2 = this.colors.border2 || lighten(this.colors.secondaryBorderColor!, 15);
    this.colors.tertiaryBorderColor =
      this.colors.tertiaryBorderColor || lighten(this.colors.tertiaryBorderColor!, 10);

    // Architecture diagram edges need special attention
    this.colors.archEdgeColor = this.colors.archEdgeColor || lighten(this.colors.lineColor!, 10);
    this.colors.archEdgeArrowColor =
      this.colors.archEdgeArrowColor || lighten(this.colors.lineColor!, 5);

    // Entity relationship borders
    this.colors.archGroupBorderColor =
      this.colors.archGroupBorderColor || lighten(this.colors.primaryBorderColor!, 15);
  }

  protected optimizeDarkModeText(): void {
    // Ensure all text colors are optimized for dark backgrounds
    this.colors.primaryTextColor = this.colors.primaryTextColor || '#ffffff';
    this.colors.secondaryTextColor = this.colors.secondaryTextColor || '#e5e5e5';
    this.colors.tertiaryTextColor = this.colors.tertiaryTextColor || '#cccccc';
    this.colors.textColor = this.colors.textColor || '#ffffff';

    // High contrast text for important elements
    this.colors.titleColor = this.colors.titleColor || '#ffffff';
    this.colors.labelTextColor = this.colors.labelTextColor || '#f0f0f0';
    this.colors.actorTextColor = this.colors.actorTextColor || this.colors.mainContrastColor!;
    this.colors.signalTextColor = this.colors.signalTextColor || this.colors.mainContrastColor!;
    this.colors.stateLabelColor = this.colors.stateLabelColor || '#ffffff';

    // Medium contrast for secondary elements
    this.colors.noteTextColor = this.colors.noteTextColor || '#e0e0e0';
    this.colors.loopTextColor = this.colors.loopTextColor || '#d0d0d0';
    this.colors.transitionLabelColor = this.colors.transitionLabelColor || '#e8e8e8';

    // Task text with proper hierarchy
    this.colors.taskTextColor = this.colors.taskTextColor || this.colors.darkTextColor!;
    this.colors.taskTextLightColor = this.colors.taskTextLightColor || '#ffffff';
    this.colors.taskTextDarkColor = this.colors.taskTextDarkColor || this.colors.darkTextColor!;
    this.colors.taskTextOutsideColor = this.colors.taskTextOutsideColor || '#cccccc';

    // Special text states
    this.colors.errorTextColor = this.colors.errorTextColor || '#ffcccc';
    this.colors.classText = this.colors.classText || '#ffffff';
    this.colors.requirementTextColor = this.colors.requirementTextColor || '#f0f0f0';
    this.colors.relationLabelColor = this.colors.relationLabelColor || '#e0e0e0';

    // Git graph text
    this.colors.gitBranchLabel0 = this.colors.gitBranchLabel0 || '#ffffff';
    this.colors.gitBranchLabel1 = this.colors.gitBranchLabel1 || '#e0e0e0';
    this.colors.tagLabelColor = this.colors.tagLabelColor || '#ffffff';
    this.colors.commitLabelColor = this.colors.commitLabelColor || '#cccccc';

    // XY Chart text
    if (!this.colors.xyChart) {
      this.colors.xyChart = {
        backgroundColor: this.colors.background!,
        titleColor: '#ffffff',
        xAxisTitleColor: '#e0e0e0',
        yAxisTitleColor: '#e0e0e0',
        xAxisLabelColor: '#cccccc',
        yAxisLabelColor: '#cccccc',
        xAxisTickColor: '#999999',
        yAxisTickColor: '#999999',
        xAxisLineColor: '#666666',
        yAxisLineColor: '#666666',
        plotColorPalette:
          '#3498db,#2ecc71,#e74c3c,#f1c40f,#bdc3c7,#ffffff,#34495e,#9b59b6,#1abc9c,#e67e22'
      };
    } else {
      this.colors.xyChart.titleColor = this.colors.xyChart.titleColor || '#ffffff';
      this.colors.xyChart.xAxisTitleColor = this.colors.xyChart.xAxisTitleColor || '#e0e0e0';
      this.colors.xyChart.yAxisTitleColor = this.colors.xyChart.yAxisTitleColor || '#e0e0e0';
      this.colors.xyChart.xAxisLabelColor = this.colors.xyChart.xAxisLabelColor || '#cccccc';
      this.colors.xyChart.yAxisLabelColor = this.colors.xyChart.yAxisLabelColor || '#cccccc';
      this.colors.xyChart.xAxisTickColor = this.colors.xyChart.xAxisTickColor || '#999999';
      this.colors.xyChart.yAxisTickColor = this.colors.xyChart.yAxisTickColor || '#999999';
      this.colors.xyChart.xAxisLineColor = this.colors.xyChart.xAxisLineColor || '#666666';
      this.colors.xyChart.yAxisLineColor = this.colors.xyChart.yAxisLineColor || '#666666';
    }

    // Radar chart text
    if (!this.colors.radar) {
      this.colors.radar = {
        axisColor: this.colors.lineColor!,
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
    } else {
      this.colors.radar.axisLabelFontSize = this.colors.radar.axisLabelFontSize || 12;
      this.colors.radar.legendFontSize = this.colors.radar.legendFontSize || 12;
    }

    // Packet diagram text
    if (!this.colors.packet) {
      this.colors.packet = {
        startByteColor: '#ffffff',
        endByteColor: '#ffffff',
        labelColor: '#e0e0e0',
        titleColor: '#ffffff',
        blockStrokeColor: this.colors.primaryTextColor!,
        blockFillColor: this.colors.background!
      };
    } else {
      this.colors.packet.startByteColor = this.colors.packet.startByteColor || '#ffffff';
      this.colors.packet.endByteColor = this.colors.packet.endByteColor || '#ffffff';
      this.colors.packet.labelColor = this.colors.packet.labelColor || '#e0e0e0';
      this.colors.packet.titleColor = this.colors.packet.titleColor || '#ffffff';
    }

    // Quadrant text
    this.colors.quadrantPointTextFill = this.colors.quadrantPointTextFill || '#ffffff';
    this.colors.quadrantXAxisTextFill = this.colors.quadrantXAxisTextFill || '#cccccc';
    this.colors.quadrantYAxisTextFill = this.colors.quadrantYAxisTextFill || '#cccccc';
    this.colors.quadrantTitleFill = this.colors.quadrantTitleFill || '#ffffff';

    // Pie chart text
    this.colors.pieTitleTextColor = this.colors.pieTitleTextColor || '#ffffff';
    this.colors.pieSectionTextColor = this.colors.pieSectionTextColor || '#e0e0e0';
    this.colors.pieLegendTextColor = this.colors.pieLegendTextColor || '#cccccc';
  }

  protected updateFlowchartColors(): void {
    this.colors.nodeBkg = this.colors.mainBkg!;
    this.colors.nodeBorder = this.colors.border1!;
    this.colors.clusterBkg = this.colors.secondBkg!;
    this.colors.clusterBorder = this.colors.border2!;
    this.colors.defaultLinkColor = this.colors.lineColor!;
    this.colors.titleColor = '#F9FFFE';
    this.colors.edgeLabelBackground = lighten(this.colors.labelBackground!, 25);
  }

  protected updateSequenceColors(): void {
    this.colors.actorBorder = this.colors.border1!;
    this.colors.actorBkg = this.colors.mainBkg!;
    this.colors.actorTextColor = this.colors.mainContrastColor!;
    this.colors.actorLineColor = this.colors.actorBorder!;
    this.colors.signalColor = this.colors.mainContrastColor!;
    this.colors.signalTextColor = this.colors.mainContrastColor!;
    this.colors.labelBoxBkgColor = this.colors.actorBkg!;
    this.colors.labelBoxBorderColor = this.colors.actorBorder!;
    this.colors.labelTextColor = this.colors.mainContrastColor!;
    this.colors.loopTextColor = this.colors.mainContrastColor!;
    this.colors.noteBorderColor = this.colors.secondaryBorderColor!;
    this.colors.noteBkgColor = this.colors.secondBkg!;
    this.colors.noteTextColor = this.colors.secondaryTextColor!;
    this.colors.activationBorderColor = this.colors.border1!;
    this.colors.activationBkgColor = this.colors.secondBkg!;
  }

  protected updateStateColors(): void {
    this.colors.transitionColor = this.colors.transitionColor || this.colors.lineColor!;
    this.colors.transitionLabelColor = this.colors.transitionLabelColor || this.colors.textColor!;
    this.colors.stateLabelColor =
      this.colors.stateLabelColor || this.colors.stateBkg || this.colors.primaryTextColor!;
    this.colors.stateBkg = this.colors.stateBkg || this.colors.mainBkg!;
    this.colors.labelBackgroundColor = this.colors.labelBackgroundColor || this.colors.stateBkg!;
    this.colors.compositeBackground =
      this.colors.compositeBackground || this.colors.background || this.colors.tertiaryColor!;
    this.colors.altBackground = this.colors.altBackground || '#555';
    this.colors.compositeTitleBackground =
      this.colors.compositeTitleBackground || this.colors.mainBkg!;
    this.colors.compositeBorder = this.colors.compositeBorder || this.colors.nodeBorder!;
    this.colors.innerEndBackground = this.colors.primaryBorderColor!;
    this.colors.specialStateColor = '#f4f4f4';
  }

  protected updateGanttColors(): void {
    this.colors.altSectionBkgColor = this.colors.background!;
    this.colors.taskBkgColor = lighten(this.colors.mainBkg!, 23);
    this.colors.taskTextColor = this.colors.darkTextColor!;
    this.colors.taskTextLightColor = this.colors.mainContrastColor!;
    this.colors.taskTextOutsideColor = this.colors.taskTextLightColor!;
    this.colors.gridColor = this.colors.mainContrastColor!;
    this.colors.doneTaskBkgColor = this.colors.mainContrastColor!;
    this.colors.taskTextDarkColor = this.colors.darkTextColor!;
  }

  // Override color scale generation for dark theme - vibrant, visible colors
  protected generateColorScale(): void {
    super.generateColorScale();

    // Dark theme specific predefined colors - brighter and more visible
    this.colors.cScale0 = this.colors.cScale0 || '#3b82f6'; // Blue
    this.colors.cScale1 = this.colors.cScale1 || '#8b5cf6'; // Purple
    this.colors.cScale2 = this.colors.cScale2 || '#06b6d4'; // Cyan
    this.colors.cScale3 = this.colors.cScale3 || '#10b981'; // Emerald
    this.colors.cScale4 = this.colors.cScale4 || '#f59e0b'; // Amber
    this.colors.cScale5 = this.colors.cScale5 || '#ef4444'; // Red
    this.colors.cScale6 = this.colors.cScale6 || '#6366f1'; // Indigo
    this.colors.cScale7 = this.colors.cScale7 || '#14b8a6'; // Teal
    this.colors.cScale8 = this.colors.cScale8 || '#84cc16'; // Lime
    this.colors.cScale9 = this.colors.cScale9 || '#f97316'; // Orange
    this.colors.cScale10 = this.colors.cScale10 || '#6366f1'; // Indigo
    this.colors.cScale11 = this.colors.cScale11 || '#22d3ee'; // Sky
    this.colors.cScale12 = this.colors.cScale12 || '#a855f7'; // Violet
  }
}

export function getDarkTheme(overrides: Partial<ThemeColors> = {}): ThemeColors {
  const theme = new DarkTheme(true);
  return theme.calculate(overrides);
}
