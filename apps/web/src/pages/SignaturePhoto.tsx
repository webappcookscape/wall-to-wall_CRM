import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Trash2, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye
} from 'lucide-react';
import { leadService } from '../services/api';

interface Photo {
  id: string;
  name: string;
  path: string;
  createdAt: string;
}

const SignaturePhoto: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const API_ROOT = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace('/api/v1', '');

  const fetchPhotos = useCallback(async () => {
    try {
      const data = await leadService.getPhotos();
      setPhotos(data);
    } catch (err) {
      console.error(err);
      setError('Could not load signature photos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a photo to upload');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      await leadService.uploadPhoto(formData);
      setSuccess('Signature photo uploaded successfully');
      setFile(null);
      // Reset input
      const input = document.getElementById('signature-input') as HTMLInputElement;
      if (input) input.value = '';
      
      fetchPhotos();
    } catch (err) {
      console.error(err);
      setError('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this signature photo?')) return;

    try {
      await leadService.deletePhoto(id);
      setPhotos(photos.filter(p => p.id !== id));
      setSuccess('Photo deleted successfully');
    } catch (err) {
      console.error(err);
      setError('Failed to delete photo');
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Signature Photo</h1>
            <p className="text-gray-500 mt-1">Manage digital signatures for your documents</p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-8">
          <form onSubmit={handleUpload} className="max-w-xl">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Upload New Signature
            </label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${file ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-brand/50'}`}>
                  <input
                    id="signature-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="text-center">
                    <Upload className={`mx-auto h-10 w-10 mb-2 ${file ? 'text-brand' : 'text-gray-400'}`} />
                    <p className="text-sm font-medium text-gray-600">
                      {file ? file.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG or GIF (max. 5MB). Image size should be 150px.</p>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={uploading || !file}
                className="px-6 py-4 bg-brand text-white rounded-lg font-bold hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-brand/20"
              >
                {uploading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                Submit
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm border border-red-100">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg text-sm border border-green-100">
                <CheckCircle2 size={18} />
                {success}
              </div>
            )}
          </form>
        </div>

        {/* List Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <ImageIcon size={18} className="text-brand" />
              List of images
            </h2>
          </div>

          {loading ? (
            <div className="p-20 text-center">
              <Loader2 className="animate-spin mx-auto text-brand mb-4" size={40} />
              <p className="text-gray-500">Loading signatures...</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="text-gray-300" size={40} />
              </div>
              <h3 className="text-lg font-bold text-gray-800">No signatures found</h3>
              <p className="text-gray-500 mt-1">Upload your first signature photo above.</p>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-brand/30 transition-all">
                  <div className="aspect-[3/2] bg-gray-50 flex items-center justify-center p-4">
                    <img 
                      src={`${API_ROOT}${photo.path}`} 
                      alt={photo.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  
                  <div className="p-4 border-t border-gray-100">
                    <p className="text-sm font-bold text-gray-700 truncate mb-1">{photo.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                      Uploaded {new Date(photo.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-brand/90 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                    <a 
                      href={`${API_ROOT}${photo.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white text-brand rounded-full hover:scale-110 transition-transform shadow-lg"
                      title="View Full Size"
                    >
                      <Eye size={20} />
                    </a>
                    <button 
                      onClick={() => handleDelete(photo.id)}
                      className="p-2 bg-white text-red-600 rounded-full hover:scale-110 transition-transform shadow-lg"
                      title="Delete Signature"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignaturePhoto;
