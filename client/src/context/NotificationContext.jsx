import { createContext, useContext } from 'react';

// Placeholder — full implementation arrives with the Notifications module.
const NotificationContext = createContext({ notifications: [], unread: 0 });

export const NotificationProvider = ({ children }) => (
  <NotificationContext.Provider value={{ notifications: [], unread: 0 }}>
    {children}
  </NotificationContext.Provider>
);

export const useNotificationContext = () => useContext(NotificationContext);
