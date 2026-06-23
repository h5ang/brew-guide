'use client';

import React from 'react';
import ActionDrawer from '@/components/common/ui/ActionDrawer';
import type { BeanReadyReminderItem } from '@/lib/utils/beanReadyReminderUtils';
import AcuteIcon from '@public/images/icons/ui/acute.svg';

interface BeanReadyReminderDrawerProps {
  isOpen: boolean;
  items: BeanReadyReminderItem[];
  onClose: () => void;
  onBeanClick: (beanId: string) => void;
}

const BeanReadyReminderDrawer: React.FC<BeanReadyReminderDrawerProps> = ({
  isOpen,
  items,
  onClose,
  onBeanClick,
}) => {
  return (
    <ActionDrawer
      isOpen={isOpen}
      onClose={onClose}
      historyId="bean-ready-reminder"
    >
      <ActionDrawer.Icon icon={AcuteIcon} />
      <ActionDrawer.Content>
        <p className="text-pretty text-neutral-500 dark:text-neutral-400">
          {items.map((item, index) => (
            <React.Fragment key={`${item.beanId}-${item.readyDate}`}>
              {index > 0 ? '；' : ''}
              <button
                type="button"
                onClick={() => onBeanClick(item.beanId)}
                className="inline appearance-none border-0 bg-transparent p-0 text-left text-neutral-800 [font:inherit] dark:text-neutral-200"
              >
                {item.coffeeBean}
              </button>
              {item.daysUntilReady === 0 ? '，今天可以喝了' : '，明天可以喝了'}
            </React.Fragment>
          ))}
          。
        </p>
      </ActionDrawer.Content>
      <ActionDrawer.Actions>
        <ActionDrawer.PrimaryButton onClick={onClose}>
          知道了
        </ActionDrawer.PrimaryButton>
      </ActionDrawer.Actions>
    </ActionDrawer>
  );
};

export default BeanReadyReminderDrawer;
