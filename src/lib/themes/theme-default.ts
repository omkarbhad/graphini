/**
 * Default light theme implementation
 */

import { lighten } from '$lib/util/color';
import { BaseTheme, type ThemeColors } from './theme-base';

export class DefaultTheme extends BaseTheme {
  protected initializeBaseColors(): void {
    // Base colors - modern and clean
    this.colors.background = '#ffffff';
    this.colors.primaryColor = '#dbeafe';
    this.colors.secondaryColor = '#fef3c7';
    this.colors.tertiaryColor = '#d1fae5';

    // Text colors - good contrast on light backgrounds
    this.colors.primaryTextColor = '#1e3a5f';
    this.colors.secondaryTextColor = '#78350f';
    this.colors.tertiaryTextColor = '#064e3b';
    this.colors.textColor = '#1f2937';

    // Border colors - visible but not harsh
    this.colors.primaryBorderColor = '#3b82f6';
    this.colors.secondaryBorderColor = '#f59e0b';
    this.colors.tertiaryBorderColor = '#10b981';

    // Main colors - improved for modern look
    this.colors.mainBkg = '#eff6ff';
    this.colors.secondBkg = '#fefce8';
    this.colors.lineColor = '#475569';
    this.colors.border1 = '#3b82f6';
    this.colors.border2 = '#f59e0b';
    this.colors.arrowheadColor = '#475569';
    this.colors.labelBackground = 'rgba(241, 245, 249, 0.9)';

    // Gantt specific colors
    this.colors.sectionBkgColor = 'rgba(102, 102, 255, 0.49)';
    this.colors.altSectionBkgColor = 'white';
    this.colors.sectionBkgColor2 = '#fff400';
    this.colors.taskBorderColor = '#534fbc';
    this.colors.taskBkgColor = '#8a90dd';
    this.colors.taskTextLightColor = 'white';
    this.colors.taskTextDarkColor = 'black';
    this.colors.taskTextClickableColor = '#003163';
    this.colors.activeTaskBorderColor = '#534fbc';
    this.colors.activeTaskBkgColor = '#bfc7ff';
    this.colors.gridColor = 'lightgrey';
    this.colors.doneTaskBkgColor = 'lightgrey';
    this.colors.doneTaskBorderColor = 'grey';
    this.colors.critBorderColor = '#ff8888';
    this.colors.critBkgColor = 'red';
    this.colors.todayLineColor = 'red';
    this.colors.vertLineColor = 'navy';

    // C4 colors
    this.colors.personBorder = this.colors.primaryBorderColor;
    this.colors.personBkg = this.colors.mainBkg;

    // State colors
    this.colors.labelColor = 'black';
    this.colors.activationBorderColor = '#666';
    this.colors.activationBkgColor = '#f4f4f4';

    // Entity relationship
    this.colors.attributeBackgroundColorOdd = '#ffffff';
    this.colors.attributeBackgroundColorEven = '#f2f2f2';
  }

  protected updateColors(): void {
    super.updateColors();

    // Additional light theme specific adjustments
    this.updateFlowchartColors();
    this.updateSequenceColors();
    this.updateStateColors();
    this.updateGanttColors();
  }

  protected updateFlowchartColors(): void {
    this.colors.nodeBkg = this.colors.mainBkg!;
    this.colors.nodeBorder = this.colors.border1!;
    this.colors.clusterBkg = this.colors.secondBkg!;
    this.colors.clusterBorder = this.colors.border2!;
    this.colors.defaultLinkColor = this.colors.lineColor!;
    this.colors.titleColor = this.colors.textColor!;
    this.colors.edgeLabelBackground = this.colors.labelBackground!;
  }

  protected updateSequenceColors(): void {
    this.colors.actorBorder = lighten(this.colors.border1!, 23);
    this.colors.actorBkg = this.colors.mainBkg!;
    this.colors.actorTextColor = 'black';
    this.colors.actorLineColor = this.colors.actorBorder!;
    this.colors.signalColor = this.colors.textColor!;
    this.colors.signalTextColor = this.colors.textColor!;
    this.colors.labelBoxBkgColor = this.colors.actorBkg!;
    this.colors.labelBoxBorderColor = this.colors.actorBorder!;
    this.colors.labelTextColor = this.colors.actorTextColor!;
    this.colors.loopTextColor = this.colors.actorTextColor!;
    this.colors.noteBorderColor = this.colors.border2!;
    this.colors.noteTextColor = this.colors.actorTextColor!;
  }

  protected updateStateColors(): void {
    this.colors.transitionColor = this.colors.lineColor!;
    this.colors.transitionLabelColor = this.colors.textColor!;
    this.colors.stateLabelColor = this.colors.stateBkg || this.colors.primaryTextColor!;
    this.colors.stateBkg = this.colors.stateBkg || this.colors.mainBkg!;
    this.colors.labelBackgroundColor = this.colors.labelBackgroundColor || this.colors.stateBkg!;
    this.colors.compositeBackground =
      this.colors.compositeBackground || this.colors.background || this.colors.tertiaryColor!;
    this.colors.altBackground = this.colors.altBackground || '#f0f0f0';
    this.colors.compositeTitleBackground =
      this.colors.compositeTitleBackground || this.colors.mainBkg!;
    this.colors.compositeBorder = this.colors.compositeBorder || this.colors.nodeBorder!;
    this.colors.innerEndBackground = this.colors.nodeBorder!;
    this.colors.specialStateColor = this.colors.lineColor!;
  }

  protected updateGanttColors(): void {
    this.colors.taskTextColor = this.colors.taskTextLightColor!;
    this.colors.taskTextOutsideColor = this.colors.taskTextDarkColor!;
  }
}

export function getDefaultTheme(overrides: Partial<ThemeColors> = {}): ThemeColors {
  const theme = new DefaultTheme(false);
  return theme.calculate(overrides);
}
