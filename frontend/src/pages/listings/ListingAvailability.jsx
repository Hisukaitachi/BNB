import React, { useEffect, useState } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";

const ListingAvailability = ({ listingId }) => {
  const [bookedDates, setBookedDates] = useState([]);

  useEffect(() => {
    if (!listingId) return;

    axios
      .get(`/api/bookings/listing/${listingId}`)
      .then((res) => {
        const events = res.data.map((b) => ({
          start: b.start_date,
          end: new Date(
            new Date(b.end_date).setDate(new Date(b.end_date).getDate() + 1)
          ),
          display: "background",
          backgroundColor: "#ffcccc",
        }));
        setBookedDates(events);
      })
      .catch((err) => console.error(err));
  }, [listingId]);

  return (
    <div className="mt-4">
      <h3 className="text-lg font-bold mb-2">Availability</h3>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={bookedDates}
        selectable={false}
        height="auto"
      />
    </div>
  );
};

export default ListingAvailability;
