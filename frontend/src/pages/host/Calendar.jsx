import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useAuth } from "../../context/AuthContext";
import { format, isWithinInterval } from "date-fns";

const Calendar = () => {
const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch bookings for the host
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

  // Handle calendar day click
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

  // Fetch Host Earnings and Payouts
  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const earningsRes = await axios.get("/payouts/host/earnings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setTotalEarnings(earningsRes.data.totalEarnings || 0);
      } catch (error) {
        console.error("Error fetching earnings:", error);
      }
    };

    const fetchPayouts = async () => {
      try {
        const payoutsRes = await axios.get("/payouts/my-received", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setPayouts(payoutsRes.data.payouts || []);
      } catch (error) {
        console.error("Error fetching received payouts:", error);
      }
    };

    Promise.all([fetchEarnings(), fetchPayouts()]).finally(() => {
      setLoading(false);
    });
  }, [token]);

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

      <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-2">Total Earnings</h2>
              <p className="text-3xl text-green-600 font-bold">₱{totalEarnings.toLocaleString()}</p>
            </div>
      
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Received Payouts</h2>
              {payouts.length === 0 ? (
                <p className="text-gray-500">No payouts received yet.</p>
              ) : (
                <table className="w-full text-left border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-4 border">Amount</th>
                      <th className="py-2 px-4 border">Method</th>
                      <th className="py-2 px-4 border">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => (
                      <tr key={payout.id}>
                        <td className="py-2 px-4 border">₱{payout.amount.toLocaleString()}</td>
                        <td className="py-2 px-4 border capitalize">{payout.method || '—'}</td>
                        <td className="py-2 px-4 border">
                          {format(new Date(payout.created_at), "PPP p")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
    </div>
  );
};

export default Calendar;
