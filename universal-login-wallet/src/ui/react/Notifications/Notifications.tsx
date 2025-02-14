import React, { useState, useEffect } from 'react';
import NotificationConnection from './NotificationConnection';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { useServices } from '../../hooks';
import {Notification} from '@universal-login/commons';

const Notifications = () => {
  const {notificationService} = useServices();
  const [notifications, setNotifications] = useState([] as Notification[]);

  useEffect(() => notificationService.subscribe(setNotifications));

  const confirmRequest = (key : string) => notificationService.confirm(key);

  const rejectRequest = (key: string) => notificationService.reject(key);

  return (
    <div className="subscreen">
      <h2 className="subscreen-title">Connection requests:</h2>
      <TransitionGroup className="notifications-list">
        {notifications.map((notification: Notification) =>
          <CSSTransition key={notification.id} timeout={200} classNames="move" >
              <NotificationConnection
                confirm={confirmRequest}
                reject={rejectRequest}
                data={notification}
                device="mobile"
              />
            </CSSTransition>
        )}
      </TransitionGroup>
    </div>
  );
};


export default Notifications;
