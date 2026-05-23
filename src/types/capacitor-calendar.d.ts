declare module '@ebarooni/capacitor-calendar' {
  export enum EventSpan {
    THIS_EVENT = 'thisEvent',
  }

  export interface CalendarListItem {
    id: string;
    title: string;
    allowsContentModifications?: boolean;
  }

  export interface CalendarEventPayload {
    title: string;
    calendarId: string;
    startDate: number;
    endDate: number;
    isAllDay: boolean;
  }

  export const CapacitorCalendar: {
    requestFullCalendarAccess(): Promise<{ result: 'granted' | string }>;
    listCalendars(): Promise<{ result: CalendarListItem[] }>;
    createCalendar(options: {
      title: string;
      color: string;
      accountName?: string;
      ownerAccount?: string;
    }): Promise<{ id: string }>;
    createEvent(payload: CalendarEventPayload): Promise<{ id: string }>;
    modifyEvent(
      payload: CalendarEventPayload & { id: string; span: EventSpan }
    ): Promise<void>;
    deleteEvent(payload: { id: string; span: EventSpan }): Promise<void>;
  };
}
