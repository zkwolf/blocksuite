import { html } from 'lit';

import { quickActionConfig } from '../../../../_common/configs/quick-action/config.js';
import type { AffineFormatBarWidget } from '../format-bar.js';

export const ActionItems = (formatBar: AffineFormatBarWidget) => {
  if (formatBar.displayType !== 'text' && formatBar.displayType !== 'block') {
    return null;
  }

  const editorHost = formatBar.host;
  return quickActionConfig
    .filter(({ showWhen }) => showWhen(editorHost))
    .map(({ id, name, icon, action, enabledWhen, disabledToolTip }) => {
      const enabled = enabledWhen(editorHost);
      const toolTip = enabled
        ? html`<affine-tooltip>${name}</affine-tooltip>`
        : html`<affine-tooltip>${disabledToolTip}</affine-tooltip>`;
      return html`<icon-button
        size="32px"
        data-testid=${id}
        ?disabled=${!enabled}
        @click=${() => enabled && action(editorHost)}
      >
        ${icon}${toolTip}
      </icon-button>`;
    });
};
