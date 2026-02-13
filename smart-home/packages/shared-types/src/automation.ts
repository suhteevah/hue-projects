export type TriggerType =
  | 'device_state'
  | 'time'
  | 'sensor'
  | 'sunset'
  | 'sunrise';

export type ConditionOperator = '==' | '!=' | '>' | '<' | '>=' | '<=';

export interface TriggerCondition {
  attribute: string;
  operator: ConditionOperator;
  value: string | number | boolean;
}

export type AutomationActionType =
  | 'set_state'
  | 'activate_scene'
  | 'delay'
  | 'notify';

export interface AutomationTrigger {
  id: string;
  type: TriggerType;
  deviceId?: string;
  condition: TriggerCondition;
}

export interface AutomationAction {
  id: string;
  type: AutomationActionType;
  deviceId?: string;
  sceneId?: string;
  payload: Record<string, unknown>;
  order: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  triggers: AutomationTrigger[];
  actions: AutomationAction[];
}
