import React, { useState, useEffect } from "react";
import { DateRange } from "react-date-range";
import {
  addDays,
  eachDayOfInterval,
  parseISO,
  differenceInDays,
} from "date-fns";
import axios from "axios";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

const BookingCalendar = ({ listingId }) => {
  const [bookedDates, setBookedDates] = useState([]);
  const [range, setRange] = useState([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), 1),
      key: "selection",
    },
  ]);

  // Fetch booked dates from backend
  useEffect(() => {
    const fetchBookedDates = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/bookings/listing/${listingId}`
        );

        const bookings = res.data?.bookings || res.data || [];

        const allDates = bookings.flatMap((booking) => {
          if (!booking.check_in || !booking.check_out) return [];
          return eachDayOfInterval({
            start: parseISO(booking.check_in),
            end: parseISO(booking.check_out),
          });
        });

        setBookedDates(allDates);
      } catch (err) {
        console.error("Error fetching booked dates:", err);
      }
    };

    fetchBookedDates();
  }, [listingId]);

  // Check if a date is booked
  const isBooked = (date) =>
    bookedDates.some((d) => d.toDateString() === date.toDateString());

  // Handle selection, prevent overlap with booked dates
  const handleSelect = (ranges) => {
    const { startDate, endDate } = ranges.selection;
    const selectedRange = eachDayOfInterval({ start: startDate, end: endDate });

    const hasConflict = selectedRange.some((d) => isBooked(d));
    if (hasConflict) {
      alert("❌ Selected dates include already booked days.");
      return;
    }

    setRange([ranges.selection]);
  };

  const nights = differenceInDays(range[0].endDate, range[0].startDate);

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white w-fit">
      <h2 className="text-lg font-semibold mb-2">Select Dates</h2>

      <DateRange
        editableDateInputs={true}
        onChange={handleSelect}
        moveRangeOnFirstSelection={false}
        ranges={range}
        months={1}
        direction="horizontal"
        minDate={new Date()}
        dayContentRenderer={(date) => (
          <div
            className={`w-8 h-8 flex items-center justify-center rounded-full 
              ${
                isBooked(date)
                  ? "bg-red-100 text-red-500 line-through cursor-not-allowed"
                  : "hover:bg-gray-200 cursor-pointer"
              }`}
          >
            {date.getDate()}
          </div>
        )}
      />

      <div className="mt-3">
        <p>
          <strong>Check-in:</strong>{" "}
          {range[0].startDate.toLocaleDateString()}
        </p>
        <p>
          <strong>Check-out:</strong>{" "}
          {range[0].endDate.toLocaleDateString()}
        </p>
        <p>
          <strong>Total Nights:</strong> {nights > 0 ? nights : 0}
        </p>
      </div>
    </div>
  );
};

export default BookingCalendar;
