import React, { useEffect, useState } from "react";
import axios from "../../api/axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useAuth } from "../../context/AuthContext";
import { format } from "date-fns";

const Calendar = () => {
  const { user, token } = useAuth(); // ✅ Now we have both user & token
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch bookings for the host
  const fetchBookings = async () => {
    try {
      // If backend uses token to get host, no need to pass user.id
      const res = await axios.get("/bookings/host-bookings", {users: { Authorization: `Bearer ${token}` } });

      const mapped = res.data.map((b) => ({
        id: b.booking_id,
        title: `${b.title} - ${b.client_name}`,
        start: b.check_in_date,
        end: new Date(
          new Date(b.check_out_date).setDate(
            new Date(b.check_out_date).getDate() + 1
          )
        ),
        backgroundColor: b.status === "approved" ? "#4CAF50" : "#FFC107",
        borderColor: "#000",
        extendedProps: {
          listingTitle: b.title,
          clientName: b.client_name,
        },
      }));

      setEvents(mapped);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
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

  // Only fetch bookings when user is ready
  useEffect(() => {
    if (user?.id) {
      fetchBookings();
    }
  }, [user]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Your Bookings Calendar</h2>

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        height="auto"
        dateClick={(info) => {
          setSelectedDate(info.dateStr);
          const eventsOnDate = events.filter((event) => {
            const start = new Date(event.start);
            const end = new Date(event.end);
            const clicked = new Date(info.dateStr);
            return clicked >= start && clicked < end;
          });
          setSelectedDateEvents(eventsOnDate);
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
                  <span className="font-medium">
                    {event.extendedProps.listingTitle}
                  </span>{" "}
                  — {event.extendedProps.clientName}
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
        <p className="text-3xl text-green-600 font-bold">
          ₱{totalEarnings.toLocaleString()}
        </p>
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
                  <td className="py-2 px-4 border">
                    ₱{payout.amount.toLocaleString()}
                  </td>
                  <td className="py-2 px-4 border capitalize">
                    {payout.method || "—"}
                  </td>
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
