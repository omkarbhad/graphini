/**
 * Structurizr C4 model types — derived from structurizr-parser output.
 */

export interface C4Person {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export interface C4SoftwareSystem {
  id: string;
  name: string;
  description: string;
  tags: string[];
  containers: C4Container[];
}

export interface C4Container {
  id: string;
  name: string;
  description: string;
  technology: string;
  tags: string[];
  components: C4Component[];
}

export interface C4Component {
  id: string;
  name: string;
  description: string;
  technology: string;
  tags: string[];
}

export interface C4DeploymentNode {
  id: string;
  name: string;
  description: string;
  technology: string;
  tags: string[];
  children: C4DeploymentNode[];
  instances: string[];
}

export interface C4Relationship {
  sourceId: string;
  targetId: string;
  description: string;
  technology: string;
  tags: string[];
}

export interface C4Model {
  people: C4Person[];
  softwareSystems: C4SoftwareSystem[];
  relationships: C4Relationship[];
  deploymentEnvironments: {
    name: string;
    deploymentNodes: C4DeploymentNode[];
  }[];
}

export interface C4ViewDefinition {
  key: string;
  type: 'systemLandscape' | 'systemContext' | 'container' | 'component' | 'dynamic' | 'deployment';
  title: string;
  description?: string;
  softwareSystemId?: string;
  containerId?: string;
  autoLayout?: { direction: 'TB' | 'BT' | 'LR' | 'RL' };
  includes: string[];
  excludes: string[];
}

export interface C4ElementStyle {
  tag: string;
  background?: string;
  color?: string;
  shape?: string;
  border?: string;
  fontSize?: number;
  opacity?: number;
}

export interface C4RelationshipStyle {
  tag: string;
  color?: string;
  thickness?: number;
  dashed?: boolean;
  fontSize?: number;
}

export interface C4Views {
  views: C4ViewDefinition[];
  elementStyles: C4ElementStyle[];
  relationshipStyles: C4RelationshipStyle[];
}

export interface C4Workspace {
  name: string;
  description: string;
  model: C4Model;
  views: C4Views;
}

export type C4NodeType = 'person' | 'softwareSystem' | 'container' | 'component' | 'deploymentNode';

export const C4_COLORS: Record<C4NodeType, string> = {
  component: '#85BBF0',
  container: '#438DD5',
  deploymentNode: '#999999',
  person: '#08427B',
  softwareSystem: '#1168BD'
};

export const C4_TEXT_COLORS: Record<C4NodeType, string> = {
  component: '#000000',
  container: '#FFFFFF',
  deploymentNode: '#000000',
  person: '#FFFFFF',
  softwareSystem: '#FFFFFF'
};
