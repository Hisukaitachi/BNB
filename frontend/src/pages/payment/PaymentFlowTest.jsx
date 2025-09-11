// PaymentFlowTest.jsx - Quick test component to verify your setup
import React, { useState } from 'react';
import { paymentAPI, bookingAPI } from '../../services/api';

const PaymentFlowTest = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const testBookingsWithPayments = async () => {
    setLoading(true);
    try {
      console.log('Testing bookings with payment data...');
      const response = await bookingAPI.getMyBookings();
      
      setResults(prev => ({
        ...prev,
        bookings: {
          success: true,
          data: response.data,
          message: `Found ${response.data.data?.bookings?.length || 0} bookings`
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        bookings: {
          success: false,
          error: error.message
        }
      }));
    }
    setLoading(false);
  };

  const testPaymentConfig = async () => {
    setLoading(true);
    try {
      console.log('Testing payment configuration...');
      const response = await paymentAPI.testConfig();
      
      setResults(prev => ({
        ...prev,
        paymentConfig: {
          success: true,
          data: response.data
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        paymentConfig: {
          success: false,
          error: error.message
        }
      }));
    }
    setLoading(false);
  };

  const testPaymentIntent = async () => {
    if (!results.bookings?.data?.data?.bookings?.length) {
      alert('Please test bookings first to get a booking ID');
      return;
    }

    const approvedBooking = results.bookings.data.data.bookings.find(
      b => b.status === 'approved' && !b.payment_status
    );

    if (!approvedBooking) {
      alert('No approved bookings without payment found. Create and approve a booking first.');
      return;
    }

    setLoading(true);
    try {
      console.log('Testing payment intent creation...');
      const response = await paymentAPI.createPaymentIntent(approvedBooking.id);
      
      setResults(prev => ({
        ...prev,
        paymentIntent: {
          success: true,
          data: response.data,
          bookingId: approvedBooking.id
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        paymentIntent: {
          success: false,
          error: error.message
        }
      }));
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold mb-6">Payment Flow Test Dashboard</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">1. Test Bookings with Payment Data</h2>
          <button 
            onClick={testBookingsWithPayments}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mr-4"
          >
            Test My Bookings API
          </button>
          
          {results.bookings && (
            <div className="mt-2 p-2 bg-gray-700 rounded text-sm">
              <strong>Result:</strong> {results.bookings.success ? '✅ Success' : '❌ Failed'}
              <pre className="mt-1 text-xs overflow-auto">
                {JSON.stringify(results.bookings, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">2. Test Payment Configuration</h2>
          <button 
            onClick={testPaymentConfig}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded mr-4"
          >
            Test PayMongo Config
          </button>
          
          {results.paymentConfig && (
            <div className="mt-2 p-2 bg-gray-700 rounded text-sm">
              <strong>Result:</strong> {results.paymentConfig.success ? '✅ Success' : '❌ Failed'}
              <pre className="mt-1 text-xs overflow-auto">
                {JSON.stringify(results.paymentConfig, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">3. Test Payment Intent Creation</h2>
          <button 
            onClick={testPaymentIntent}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded mr-4"
          >
            Test Payment Intent
          </button>
          
          {results.paymentIntent && (
            <div className="mt-2 p-2 bg-gray-700 rounded text-sm">
              <strong>Result:</strong> {results.paymentIntent.success ? '✅ Success' : '❌ Failed'}
              <pre className="mt-1 text-xs overflow-auto">
                {JSON.stringify(results.paymentIntent, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Quick Status Check</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Bookings API:</strong> 
              <span className={results.bookings?.success ? 'text-green-400' : 'text-red-400'}>
                {results.bookings ? (results.bookings.success ? ' Working' : ' Failed') : ' Not tested'}
              </span>
            </div>
            <div>
              <strong>Payment Config:</strong>
              <span className={results.paymentConfig?.success ? 'text-green-400' : 'text-red-400'}>
                {results.paymentConfig ? (results.paymentConfig.success ? ' Working' : ' Failed') : ' Not tested'}
              </span>
            </div>
            <div>
              <strong>Payment Intent:</strong>
              <span className={results.paymentIntent?.success ? 'text-green-400' : 'text-red-400'}>
                {results.paymentIntent ? (results.paymentIntent.success ? ' Working' : ' Failed') : ' Not tested'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg text-black">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p>Testing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentFlowTest;