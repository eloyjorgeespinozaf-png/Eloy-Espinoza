/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import InterdictionAlertTracker from './InterdictionAlertTracker';
import { ChartDataPoint, TacticalUnit, AutomatedOrder, RawAlert } from '../types';

interface InteractiveChartCreatorProps {
  initialData?: ChartDataPoint[];
  tacticalUnits?: TacticalUnit[];
  activeOrders?: AutomatedOrder[];
  rawAlerts?: RawAlert[];
  onConfirmOrder?: (id: string, newStatus: 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED') => void;
  onAddOrderUpdate?: (orderId: string, updateMsg: string) => void;
  onCreateOrder?: (order: AutomatedOrder) => void;
}

/**
 * InterdictionAlertTracker wrapper for backwards compatibility
 * The tactical chart creator has been removed from the search organs module,
 * maintaining only the interdiction alert and tracking window.
 */
export default function InteractiveChartCreator(props: InteractiveChartCreatorProps) {
  return (
    <InterdictionAlertTracker
      tacticalUnits={props.tacticalUnits}
      activeOrders={props.activeOrders}
      rawAlerts={props.rawAlerts}
      onConfirmOrder={props.onConfirmOrder}
      onAddOrderUpdate={props.onAddOrderUpdate}
      onCreateOrder={props.onCreateOrder}
    />
  );
}
