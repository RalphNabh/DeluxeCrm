"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Folder, Plus, Edit, Trash2, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClientFolder {
  id: string;
  name: string;
  color: string;
  description?: string;
}

interface FolderManagerProps {
  folders: ClientFolder[];
  onFoldersChange: () => void;
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
}

const FOLDER_COLORS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#10b981', label: 'Green' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#84cc16', label: 'Lime' },
];

export default function FolderManager({
  folders,
  onFoldersChange,
  selectedFolderId,
  onFolderSelect,
}: FolderManagerProps) {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showEditFolder, setShowEditFolder] = useState<ClientFolder | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState("#3b82f6");
  const [folderDescription, setFolderDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/client-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName.trim(),
          color: folderColor,
          description: folderDescription.trim() || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to create folder');

      setFolderName("");
      setFolderColor("#3b82f6");
      setFolderDescription("");
      setShowNewFolder(false);
      onFoldersChange();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  const handleEditFolder = async (folder: ClientFolder) => {
    if (!folderName.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/client-folders/${folder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName.trim(),
          color: folderColor,
          description: folderDescription.trim() || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to update folder');

      setShowEditFolder(null);
      setFolderName("");
      setFolderColor("#3b82f6");
      setFolderDescription("");
      onFoldersChange();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update folder');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? Clients in this folder will be moved to "No Folder".')) {
      return;
    }

    try {
      const response = await fetch(`/api/client-folders/${folderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete folder');

      if (selectedFolderId === folderId) {
        onFolderSelect(null);
      }
      onFoldersChange();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete folder');
    }
  };

  const openEditDialog = (folder: ClientFolder) => {
    setShowEditFolder(folder);
    setFolderName(folder.name);
    setFolderColor(folder.color);
    setFolderDescription(folder.description || "");
  };

  return (
    <div className="space-y-4">
      {/* Folder Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 flex-1 overflow-x-auto">
          <Button
            variant={selectedFolderId === null ? "default" : "outline"}
            size="sm"
            onClick={() => onFolderSelect(null)}
            className="whitespace-nowrap"
          >
            All Clients
          </Button>
          {folders.map((folder) => (
            <Button
              key={folder.id}
              variant={selectedFolderId === folder.id ? "default" : "outline"}
              size="sm"
              onClick={() => onFolderSelect(folder.id)}
              className="whitespace-nowrap"
              style={
                selectedFolderId === folder.id
                  ? { backgroundColor: folder.color, borderColor: folder.color }
                  : {}
              }
            >
              <Folder className="h-4 w-4 mr-2" style={{ color: folder.color }} />
              {folder.name}
            </Button>
          ))}
        </div>

        {/* Create Folder Dialog */}
        <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
              <DialogDescription>
                Organize your clients into folders for better management.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="folder-name">Folder Name</Label>
                <Input
                  id="folder-name"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="e.g., Residential, Commercial"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="folder-color">Color</Label>
                <Select value={folderColor} onValueChange={setFolderColor}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FOLDER_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color.value }}
                          />
                          <span>{color.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="folder-description">Description (Optional)</Label>
                <Input
                  id="folder-description"
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  placeholder="Brief description of this folder"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowNewFolder(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder} disabled={loading || !folderName.trim()}>
                  {loading ? "Creating..." : "Create Folder"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Folder Dialog */}
        <Dialog open={showEditFolder !== null} onOpenChange={(open) => !open && setShowEditFolder(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Folder</DialogTitle>
              <DialogDescription>
                Update folder details.
              </DialogDescription>
            </DialogHeader>
            {showEditFolder && (
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="edit-folder-name">Folder Name</Label>
                  <Input
                    id="edit-folder-name"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-folder-color">Color</Label>
                  <Select value={folderColor} onValueChange={setFolderColor}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOLDER_COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: color.value }}
                            />
                            <span>{color.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-folder-description">Description (Optional)</Label>
                  <Input
                    id="edit-folder-description"
                    value={folderDescription}
                    onChange={(e) => setFolderDescription(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowEditFolder(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleEditFolder(showEditFolder)}
                    disabled={loading || !folderName.trim()}
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Folder List with Actions */}
      {folders.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
            >
              <Folder className="h-4 w-4" style={{ color: folder.color }} />
              <span className="text-sm font-medium">{folder.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => openEditDialog(folder)}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                onClick={() => handleDeleteFolder(folder.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


