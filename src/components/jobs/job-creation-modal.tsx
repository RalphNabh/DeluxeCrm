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

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface JobCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: (job: any) => void;
}

export default function JobCreationModal({ isOpen, onClose, onJobCreated }: JobCreationModalProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    client_id: "",
    start_time: "",
    end_time: "",
    status: "Scheduled",
    location: "",
    description: "",
    estimated_duration: "",
    team_members: "",
    equipment: "",
    notes: ""
  });

  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

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
    setLoading(true);

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          estimated_duration: parseFloat(formData.estimated_duration) || 0,
          team_members: formData.team_members ? formData.team_members.split(',').map(m => m.trim()) : [],
          equipment: formData.equipment ? formData.equipment.split(',').map(e => e.trim()) : []
        }),
      });

      if (response.ok) {
        const newJob = await response.json();
        onJobCreated(newJob);
        onClose();
        setFormData({
          title: "",
          client_id: "",
          start_time: "",
          end_time: "",
          status: "Scheduled",
          location: "",
          description: "",
          estimated_duration: "",
          team_members: "",
          equipment: "",
          notes: ""
        });
      } else {
        console.error('Failed to create job');
      }
    } catch (error) {
      console.error('Error creating job:', error);
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
            <span>Schedule New Job</span>
          </DialogTitle>
          <DialogDescription>
            Create a new job and schedule it in your calendar.
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

            {/* Start Time */}
            <div>
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => handleInputChange('start_time', e.target.value)}
                required
              />
            </div>

            {/* End Time */}
            <div>
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => handleInputChange('end_time', e.target.value)}
                required
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
            <div>
              <Label htmlFor="team_members">Team Members</Label>
              <Input
                id="team_members"
                value={formData.team_members}
                onChange={(e) => handleInputChange('team_members', e.target.value)}
                placeholder="John, Mike, Sarah (comma separated)"
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
              {loading ? "Creating..." : "Schedule Job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
