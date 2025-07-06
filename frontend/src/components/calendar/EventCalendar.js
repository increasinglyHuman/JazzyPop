/**
 * Public Event Calendar Component
 * Displays all scheduled events in a calendar view
 */

class EventCalendar {
    constructor(container) {
        this.container = container;
        this.currentDate = new Date();
        this.currentView = 'month'; // 'month' or 'week'
        this.events = [];
        this.init();
    }

    init() {
        this.render();
        this.loadEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="event-calendar">
                <div class="calendar-header">
                    <h2 class="calendar-title">Event Calendar</h2>
                    <div class="calendar-controls">
                        <div class="view-toggle">
                            <button class="view-btn ${this.currentView === 'month' ? 'active' : ''}" data-view="month">Month</button>
                            <button class="view-btn ${this.currentView === 'week' ? 'active' : ''}" data-view="week">Week</button>
                        </div>
                        <div class="nav-controls">
                            <button class="nav-btn" id="prevBtn">‹</button>
                            <span class="current-period" id="currentPeriod"></span>
                            <button class="nav-btn" id="nextBtn">›</button>
                        </div>
                    </div>
                </div>
                <div class="calendar-body" id="calendarBody">
                    <!-- Calendar content will be rendered here -->
                </div>
                <div class="event-legend">
                    <h3>Event Types</h3>
                    <div class="legend-items">
                        ${this.renderLegend()}
                    </div>
                </div>
            </div>
        `;

        this.attachEventHandlers();
        this.updateCalendar();
    }

    renderLegend() {
        const eventTypes = [
            { type: 'discount', label: 'Discounts', icon: '💰' },
            { type: 'boost', label: 'XP Boosts', icon: '⭐' },
            { type: 'gems', label: 'Gem Bonuses', icon: '💎' },
            { type: 'free', label: 'Free Play', icon: '🎮' },
            { type: 'energy', label: 'Energy Events', icon: '⚡' },
            { type: 'limited', label: 'Limited Time', icon: '⏱️' },
            { type: 'celebration', label: 'Holidays', icon: '🎉' }
        ];

        return eventTypes.map(type => `
            <div class="legend-item">
                <span class="legend-icon">${type.icon}</span>
                <span class="legend-label">${type.label}</span>
            </div>
        `).join('');
    }

    attachEventHandlers() {
        // View toggle
        this.container.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentView = btn.dataset.view;
                this.render();
            });
        });

        // Navigation
        document.getElementById('prevBtn').addEventListener('click', () => this.navigate(-1));
        document.getElementById('nextBtn').addEventListener('click', () => this.navigate(1));
    }

    navigate(direction) {
        if (this.currentView === 'month') {
            this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        } else {
            this.currentDate.setDate(this.currentDate.getDate() + (direction * 7));
        }
        this.updateCalendar();
    }

    updateCalendar() {
        const periodElement = document.getElementById('currentPeriod');
        const bodyElement = document.getElementById('calendarBody');

        if (this.currentView === 'month') {
            periodElement.textContent = this.formatMonthYear(this.currentDate);
            bodyElement.innerHTML = this.renderMonthView();
        } else {
            periodElement.textContent = this.formatWeekRange(this.currentDate);
            bodyElement.innerHTML = this.renderWeekView();
        }
    }

    renderMonthView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        let html = '<div class="calendar-grid month-view">';
        
        // Day headers
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        html += '<div class="day-headers">';
        dayNames.forEach(day => {
            html += `<div class="day-header">${day}</div>`;
        });
        html += '</div>';

        // Calendar days
        html += '<div class="calendar-days">';
        for (let i = 0; i < 42; i++) { // 6 weeks
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = this.isToday(currentDate);
            const dayEvents = this.getEventsForDate(currentDate);

            html += `
                <div class="calendar-day ${isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}">
                    <div class="day-number">${currentDate.getDate()}</div>
                    ${this.renderDayEvents(dayEvents)}
                </div>
            `;
        }
        html += '</div></div>';

        return html;
    }

    renderWeekView() {
        const startOfWeek = new Date(this.currentDate);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

        let html = '<div class="calendar-grid week-view">';
        
        // Time slots
        const hours = Array.from({length: 24}, (_, i) => i);
        
        html += '<div class="week-timeline">';
        html += '<div class="time-header"></div>'; // Empty corner cell
        
        // Day headers
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const isToday = this.isToday(date);
            
            html += `
                <div class="week-day-header ${isToday ? 'today' : ''}">
                    <div class="day-name">${this.getDayName(date)}</div>
                    <div class="day-date">${date.getDate()}</div>
                </div>
            `;
        }
        html += '</div>';

        // Time grid
        html += '<div class="week-grid">';
        hours.forEach(hour => {
            html += '<div class="hour-row">';
            html += `<div class="time-label">${this.formatHour(hour)}</div>`;
            
            for (let day = 0; day < 7; day++) {
                const date = new Date(startOfWeek);
                date.setDate(startOfWeek.getDate() + day);
                date.setHours(hour, 0, 0, 0);
                
                const hourEvents = this.getEventsForHour(date);
                html += `
                    <div class="hour-cell ${hourEvents.length > 0 ? 'has-events' : ''}">
                        ${this.renderHourEvents(hourEvents)}
                    </div>
                `;
            }
            html += '</div>';
        });
        html += '</div></div>';

        return html;
    }

    renderDayEvents(events) {
        if (events.length === 0) return '';
        
        const maxDisplay = 3;
        const displayEvents = events.slice(0, maxDisplay);
        const moreCount = events.length - maxDisplay;

        let html = '<div class="day-events">';
        displayEvents.forEach(event => {
            html += `<div class="event-dot-small ${event.type}" title="${event.label}"></div>`;
        });
        
        if (moreCount > 0) {
            html += `<div class="more-events">+${moreCount}</div>`;
        }
        html += '</div>';

        return html;
    }

    renderHourEvents(events) {
        return events.map(event => `
            <div class="hour-event ${event.type}" title="${event.label}">
                <span class="event-time">${this.formatEventTime(event)}</span>
                <span class="event-name">${event.label}</span>
            </div>
        `).join('');
    }

    loadEvents() {
        // Load all scheduled events
        // For now, we'll use the events from EconomyManager
        // In the future, this will load from a backend API
        
        this.events = this.getAllScheduledEvents();
        this.updateCalendar();
    }

    getAllScheduledEvents() {
        const events = [];
        const year = new Date().getFullYear();

        // Regular daily events
        for (let month = 0; month < 12; month++) {
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dayOfWeek = date.getDay();

                // Happy Hour - 3 PM and 7 PM daily
                events.push({
                    date: new Date(year, month, day, 15, 0),
                    type: 'discount',
                    label: '🎉 Happy Hour',
                    duration: 60
                });
                events.push({
                    date: new Date(year, month, day, 19, 0),
                    type: 'discount',
                    label: '🎉 Happy Hour',
                    duration: 60
                });

                // Day-specific events
                if (dayOfWeek === 1) { // Monday
                    events.push({
                        date: new Date(year, month, day),
                        type: 'energy',
                        label: '☕ Monday Motivation',
                        allDay: true
                    });
                }
                if (dayOfWeek === 3) { // Wednesday
                    events.push({
                        date: new Date(year, month, day),
                        type: 'gems',
                        label: '💎 Gem Wednesday',
                        allDay: true
                    });
                }
                if (dayOfWeek === 5) { // Friday
                    events.push({
                        date: new Date(year, month, day),
                        type: 'free',
                        label: '🎊 Free Friday',
                        allDay: true
                    });
                    
                    // Weekend boost starts Friday 5 PM
                    events.push({
                        date: new Date(year, month, day, 17, 0),
                        type: 'boost',
                        label: '🌟 Weekend Boost',
                        duration: 54 * 60 // Through Sunday
                    });
                }
            }
        }

        // Holiday events
        const holidays = [
            { month: 0, day: 1, type: 'celebration', label: '🎊 New Year Special' },
            { month: 1, day: 14, type: 'hearts', label: '💝 Valentine Special' },
            { month: 3, day: 1, type: 'chaos', label: '🃏 April Fools!' },
            { month: 6, day: 4, type: 'freedom', label: '🎆 Freedom Play' },
            { month: 9, day: 31, type: 'spooky', label: '🎃 Halloween Special' },
            { month: 10, day: 25, type: 'grateful', label: '🦃 Thankful Thursday' },
            { month: 11, day: 25, type: 'gift', label: '🎄 Holiday Magic' }
        ];

        holidays.forEach(holiday => {
            events.push({
                date: new Date(year, holiday.month, holiday.day),
                type: holiday.type,
                label: holiday.label,
                allDay: true,
                isHoliday: true
            });
        });

        return events;
    }

    getEventsForDate(date) {
        return this.events.filter(event => {
            if (event.allDay) {
                return this.isSameDay(event.date, date);
            }
            return this.isSameDay(event.date, date);
        });
    }

    getEventsForHour(date) {
        return this.events.filter(event => {
            if (event.allDay) return false;
            
            const eventStart = new Date(event.date);
            const eventEnd = new Date(event.date);
            if (event.duration) {
                eventEnd.setMinutes(eventEnd.getMinutes() + event.duration);
            }

            return eventStart <= date && date < eventEnd;
        });
    }

    // Utility methods
    isToday(date) {
        const today = new Date();
        return this.isSameDay(date, today);
    }

    isSameDay(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    formatMonthYear(date) {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    formatWeekRange(date) {
        const start = new Date(date);
        start.setDate(start.getDate() - start.getDay());
        const end = new Date(start);
        end.setDate(end.getDate() + 6);

        const formatOptions = { month: 'short', day: 'numeric' };
        return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
    }

    getDayName(date) {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    }

    formatHour(hour) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour} ${period}`;
    }

    formatEventTime(event) {
        return event.date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    }
}

// Export for use
window.EventCalendar = EventCalendar;