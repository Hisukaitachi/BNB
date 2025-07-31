import React, { useEffect, useState } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useAuth } from "../../context/AuthContext";
import { format, isWithinInterval } from "date-fns";

const Calendar = () => {
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [hostEarnings, setHostEarnings] = useState(null); // host earnings state

  const fetchBookings = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/bookings/host-bookings", {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });

      const bookings = res.data.bookings;

      const formattedEvents = bookings.map((booking) => ({
        id: booking.id,
        title: `${booking.listing_title} - ${booking.client_name}`,
        start: booking.check_in_date,
        end: booking.check_out_date,
        allDay: true,
        extendedProps: {
          clientName: booking.client_name,
          listingTitle: booking.listing_title,
        },
        backgroundColor: "#1E88E5",
        borderColor: "#1565C0",
        textColor: "#fff",
      }));

      setEvents(formattedEvents);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  };

  const fetchHostEarnings = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/payouts/host-total", {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });

      setHostEarnings(res.data.total_earnings || 0);
    } catch (err) {
      console.error("Error fetching host earnings:", err);
    }
  };

  const handleDateClick = (info) => {
    const clickedDate = new Date(info.dateStr);
    setSelectedDate(info.dateStr);

    const filtered = events.filter((event) => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      return isWithinInterval(clickedDate, {
        start,
        end: new Date(end.setDate(end.getDate() - 1)),
      });
    });

    setSelectedDateEvents(filtered);
  };

  useEffect(() => {
    if (user?.token) {
      fetchBookings();
      fetchHostEarnings();
    }
  }, [user]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">My Airbnb-Style Calendar</h2>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        dateClick={handleDateClick}
        height="auto"
        selectable={true}
        dayMaxEventRows={2}
        headerToolbar={{
          start: "prev,next today",
          center: "title",
          end: "dayGridMonth,timeGridWeek",
        }}
      />

      {selectedDate && (
        <div className="mt-6 bg-white p-4 rounded shadow-md border">
          <h3 className="text-lg font-bold mb-2">
            Bookings on {format(new Date(selectedDate), "PPP")}:
          </h3>

          {selectedDateEvents.length > 0 ? (
            <ul className="list-disc list-inside space-y-1">
              {selectedDateEvents.map((event) => (
                <li key={event.id}>
                  <span className="font-medium">{event.extendedProps.listingTitle}</span> —{" "}
                  {event.extendedProps.clientName}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No bookings on this date.</p>
          )}
        </div>
      )}

      <div className="mt-8 bg-green-50 border border-green-300 p-4 rounded-md shadow-sm">
        <h3 className="text-lg font-semibold text-green-800 mb-2">Total Payouts Received:</h3>
        <p className="text-2xl font-bold text-green-900">
          ₱ {hostEarnings?.toLocaleString("en-PH") ?? "0.00"}
        </p>
      </div>
    </div>
  );
};

export default Calendar;
