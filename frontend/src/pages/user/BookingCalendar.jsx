import React, { useState, useEffect } from "react";
import { DateRange } from "react-date-range";
import { addDays, differenceInDays, eachDayOfInterval, parseISO } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import axios from "axios";

const BookingCalendar = ({ listingId }) => {
  const [bookedDates, setBookedDates] = useState([]);
  const [range, setRange] = useState([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), 1),
      key: "selection",
    },
  ]);

  useEffect(() => {
    axios
      .get(`/bookings/booked-dates/${listingId}`)
      .then((res) => {
        const disabled = [];
        res.data.bookedDates.forEach((booking) => {
          const dates = eachDayOfInterval({
            start: parseISO(booking.start_date),
            end: parseISO(booking.end_date),
          });
          disabled.push(...dates);
        });
        setBookedDates(disabled);
      })
      .catch((err) => console.error("Error fetching booked dates", err));
  }, [listingId]);

  const nights = differenceInDays(range[0].endDate, range[0].startDate);

  return (
    <div className="p-4 border rounded-xl bg-white shadow-md">
      <h2 className="text-xl font-semibold mb-2">Select Dates</h2>
      <DateRange
        ranges={range}
        onChange={(item) => setRange([item.selection])}
        minDate={new Date()}
        disabledDates={bookedDates} // Correct prop
        rangeColors={["#00A699"]}
      />
      <div className="mt-4">
        {nights > 0 && (
          <p className="text-gray-700">
            {nights} night{nights > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
};

export default BookingCalendar;
