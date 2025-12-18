"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, MapPin, User, X } from "lucide-react";
import TeamMemberSelector from "./team-member-selector";
import TimePicker from "@/components/ui/time-picker";

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface Job {
  id: string;
  title: string;
  client_id: string;
  start_time: string;
  end_time: string;
  status: string;
  location?: string;
  description?: string;
  estimated_duration?: number;
  team_members?: string[];
  equipment?: string[];
  notes?: string;
  tags?: string[];
}

interface JobEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobUpdated: (job: any) => void;
  job: Job | null;
}

export default function JobEditModal({ isOpen, onClose, onJobUpdated, job }: JobEditModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    client_id: "",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    status: "Scheduled",
    location: "",
    description: "",
    estimated_duration: "",
    team_members: "",
    equipment: "",
    notes: "",
    tags: ""
  });

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      if (job) {
        // Convert datetime to datetime-local format (handles timezone correctly)
        const formatDateTimeLocal = (dateString: string) => {
          try {
            const date = new Date(dateString);
            // Get local date components
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
          } catch (error) {
            console.error('Error formatting date:', error);
            return '';
          }
        };

        // Split date and time for better UX
        const splitDateTime = (dateString: string) => {
          try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return {
              date: `${year}-${month}-${day}`,
              time: `${hours}:${minutes}`
            };
          } catch (error) {
            return { date: '', time: '' };
          }
        };

        const startDateTime = job.start_time ? splitDateTime(job.start_time) : { date: '', time: '' };
        const endDateTime = job.end_time ? splitDateTime(job.end_time) : { date: '', time: '' };

        setFormData({
          title: job.title || "",
          client_id: job.client_id || "",
          start_date: startDateTime.date,
          start_time: startDateTime.time,
          end_date: endDateTime.date,
          end_time: endDateTime.time,
          status: job.status || "Scheduled",
          location: job.location || "",
          description: job.description || "",
          estimated_duration: job.estimated_duration?.toString() || "",
          team_members: job.team_members?.join(', ') || "",
          equipment: job.equipment?.join(', ') || "",
          notes: job.notes || "",
          tags: job.tags?.join(', ') || ""
        });
      } else {
        // Reset form when no job is selected
        setFormData({
          title: "",
          client_id: "",
          start_date: "",
          start_time: "",
          end_date: "",
          end_time: "",
          status: "Scheduled",
          location: "",
          description: "",
          estimated_duration: "",
          team_members: "",
          equipment: "",
          notes: "",
          tags: ""
        });
      }
    }
  }, [isOpen, job]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;

    setLoading(true);

    try {
      // Convert date and time to ISO format for database
      // Treat the date/time as local time and send it as-is (database will store it)
      const formatDateTimeISO = (dateStr: string, timeStr: string) => {
        if (!dateStr || !timeStr) return null;
        try {
          // Parse the date and time components
          const [year, month, day] = dateStr.split('-').map(Number);
          const [hours, minutes] = timeStr.split(':').map(Number);
          
          // Create a date object in local timezone (this is what the user selected)
          const localDate = new Date(year, month - 1, day, hours, minutes, 0);
          
          // Convert to ISO string - this will include timezone offset
          // But we need to send it as the user intended, so we'll format it manually
          // to ensure the time is preserved as the user selected it
          const isoString = localDate.toISOString();
          
          console.log('Date conversion:', {
            input: `${dateStr}T${timeStr}:00`,
            localDate,
            isoString,
            hours: localDate.getHours(),
            minutes: localDate.getMinutes()
          });
          
          return isoString;
        } catch (error) {
          console.error('Error formatting date/time:', error);
          // Fallback: send as local datetime string
          return `${dateStr}T${timeStr}:00`;
        }
      };

      const startTimeISO = formatDateTimeISO(formData.start_date, formData.start_time);
      const endTimeISO = formatDateTimeISO(formData.end_date, formData.end_time);

      if (!startTimeISO || !endTimeISO) {
        alert('Please fill in both start and end date/time');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          client_id: formData.client_id,
          start_time: startTimeISO,
          end_time: endTimeISO,
          status: formData.status,
          location: formData.location,
          description: formData.description,
          estimated_duration: parseFloat(formData.estimated_duration) || 0,
          team_members: formData.team_members ? formData.team_members.split(',').map(m => m.trim()) : [],
          equipment: formData.equipment ? formData.equipment.split(',').map(e => e.trim()) : [],
          notes: formData.notes,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : []
        }),
      });

      if (response.ok) {
        const updatedJob = await response.json();
        console.log('Job updated successfully:', updatedJob);
        console.log('Updated times:', {
          start_time: updatedJob.start_time,
          end_time: updatedJob.end_time
        });
        onJobUpdated(updatedJob);
        onClose();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to update job:', errorData.error);
        alert('Failed to update job: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating job:', error);
      alert('Failed to update job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const selectedClient = clients.find(c => c.id === formData.client_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>Edit Job</span>
          </DialogTitle>
          <DialogDescription>
            Update job details and schedule information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Job Title */}
            <div className="md:col-span-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Lawn Maintenance - Smith Residence"
                required
              />
            </div>

            {/* Client Selection */}
            <div className="md:col-span-2">
              <Label htmlFor="client_id">Client *</Label>
              <Select value={formData.client_id} onValueChange={(value) => handleInputChange('client_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{client.name}</span>
                        {client.email && <span className="text-gray-500">({client.email})</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Client Info */}
            {selectedClient && (
              <div className="md:col-span-2 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{selectedClient.name}</div>
                    {selectedClient.email && <div className="text-sm text-gray-600">{selectedClient.email}</div>}
                    {selectedClient.phone && <div className="text-sm text-gray-600">{selectedClient.phone}</div>}
                    {selectedClient.address && <div className="text-sm text-gray-600">{selectedClient.address}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Start Date */}
            <div>
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                required
                className="w-full"
              />
            </div>

            {/* Start Time */}
            <div>
              <TimePicker
                value={formData.start_time}
                onChange={(value) => handleInputChange('start_time', value)}
                label="Start Time"
                required
              />
            </div>

            {/* End Date */}
            <div>
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                required
                className="w-full"
                min={formData.start_date || undefined}
              />
            </div>

            {/* End Time */}
            <div>
              <TimePicker
                value={formData.end_time}
                onChange={(value) => handleInputChange('end_time', value)}
                label="End Time"
                required
                min={formData.start_date === formData.end_date ? formData.start_time : undefined}
              />
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estimated Duration */}
            <div>
              <Label htmlFor="estimated_duration">Estimated Duration (hours)</Label>
              <Input
                id="estimated_duration"
                type="number"
                step="0.5"
                value={formData.estimated_duration}
                onChange={(e) => handleInputChange('estimated_duration', e.target.value)}
                placeholder="2.5"
              />
            </div>

            {/* Location */}
            <div className="md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="123 Main St, City, State"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the work to be performed..."
                rows={3}
              />
            </div>

            {/* Team Members */}
            <div className="md:col-span-2">
              <TeamMemberSelector
                value={formData.team_members}
                onChange={(value) => handleInputChange('team_members', value)}
                label="Team Members"
                placeholder="Select team members or type names manually"
              />
            </div>

            {/* Equipment */}
            <div>
              <Label htmlFor="equipment">Equipment Needed</Label>
              <Input
                id="equipment"
                value={formData.equipment}
                onChange={(e) => handleInputChange('equipment', e.target.value)}
                placeholder="Mower, Trimmer, Blower (comma separated)"
              />
            </div>

            {/* Tags */}
            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                placeholder="e.g., urgent, follow-up, maintenance (comma-separated)"
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any special instructions or notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

