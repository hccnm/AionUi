import { cleanupSiderTooltips, getSiderTooltipProps } from '@renderer/utils/ui/siderTooltip';
import { useLayoutContext } from '@renderer/hooks/context/LayoutContext';
import { blurActiveElement } from '@renderer/utils/ui/focus';
import { usePreviewContext } from '@renderer/pages/conversation/Preview/context/PreviewContext';
import WorkspaceGroupedHistory from '@renderer/pages/conversation/GroupedHistory';
import { SiderSearchEntry, SiderToolbar } from '@renderer/components/layout/Sider/SiderNav';
import classNames from 'classnames';
import React, { Suspense, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const WebSider = () => {
  const layout = useLayoutContext();
  const isMobile = layout?.isMobile ?? false;
  const navigate = useNavigate();
  const { closePreview } = usePreviewContext();
  const [isBatchMode, setIsBatchMode] = useState(false);
  const collapsed = layout?.siderCollapsed ?? false;
  const tooltipEnabled = collapsed && !isMobile;
  const siderTooltipProps = getSiderTooltipProps(tooltipEnabled);

  const handleNewChat = () => {
    cleanupSiderTooltips();
    blurActiveElement();
    closePreview();
    setIsBatchMode(false);
    void navigate('/guid', { state: { resetAssistant: true } });
  };

  const handleConversationSelect = () => {
    cleanupSiderTooltips();
    blurActiveElement();
    closePreview();
    setIsBatchMode(false);
  };

  return (
    <div className='size-full flex flex-col gap-2px'>
      <div className='shrink-0'>
        <SiderToolbar
          isMobile={isMobile}
          isBatchMode={isBatchMode}
          collapsed={collapsed}
          siderTooltipProps={siderTooltipProps}
          onNewChat={handleNewChat}
          onToggleBatchMode={() => setIsBatchMode((value) => !value)}
        />
      </div>
      <div className='shrink-0'>
        <SiderSearchEntry
          isMobile={isMobile}
          collapsed={collapsed}
          siderTooltipProps={siderTooltipProps}
          onConversationSelect={handleConversationSelect}
        />
      </div>
      <div
        className={classNames(
          'shrink-0 mt-6px mb-2px h-1px bg-[var(--color-border-2)]',
          collapsed ? 'mx-6px' : 'mx-10px'
        )}
      />
      <div className='min-h-0 flex-1 overflow-y-auto'>
        <Suspense fallback={<div className='min-h-200px' />}>
          <WorkspaceGroupedHistory
            collapsed={collapsed}
            tooltipEnabled={tooltipEnabled}
            batchMode={isBatchMode}
            onBatchModeChange={setIsBatchMode}
          />
        </Suspense>
      </div>
    </div>
  );
};
