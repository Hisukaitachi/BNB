// frontend/src/components/ViewRequestModal.jsx
import { useState } from 'react';
import { X, Calendar, Clock, Send } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Textarea } from '../ui/Input';

const ViewRequestModal = ({ listing, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    message: '',
    preferred_date: '',
    preferred_time: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!formData.message.trim()) {
      newErrors.message = 'Please include a message';
    }
    if (!formData.preferred_date) {
      newErrors.preferred_date = 'Please select a preferred date';
    }
    if (!formData.preferred_time) {
      newErrors.preferred_time = 'Please select a preferred time';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        listingId: listing.id,
        ...formData
      });
      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Request Viewing</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">{listing.title}</h3>
          <p className="text-gray-400 text-sm">{listing.location}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-3 text-sm">
              {errors.submit}
            </div>
          )}

          <Textarea
            label="Message to Host"
            name="message"
            value={formData.message}
            onChange={handleChange}
            error={errors.message}
            placeholder="Hi! I'm interested in viewing this property. Could we arrange a time?"
            rows={4}
            className="bg-white/10 border-gray-600 text-white placeholder-gray-400"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Preferred Date
              </label>
              <Input
                type="date"
                name="preferred_date"
                value={formData.preferred_date}
                onChange={handleChange}
                error={errors.preferred_date}
                min={new Date().toISOString().split('T')[0]}
                className="bg-white/10 border-gray-600 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Preferred Time
              </label>
              <select
                name="preferred_time"
                value={formData.preferred_time}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select time</option>
                <option value="09:00">9:00 AM</option>
                <option value="10:00">10:00 AM</option>
                <option value="11:00">11:00 AM</option>
                <option value="14:00">2:00 PM</option>
                <option value="15:00">3:00 PM</option>
                <option value="16:00">4:00 PM</option>
                <option value="17:00">5:00 PM</option>
              </select>
              {errors.preferred_time && (
                <p className="mt-1 text-sm text-red-500">{errors.preferred_time}</p>
              )}
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              className="flex-1"
              loading={loading}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ViewRequestModal;