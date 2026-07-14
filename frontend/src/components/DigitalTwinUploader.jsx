// src/components/DigitalTwinUploader.jsx
import React, { useState } from 'react';
import { uploadDigitalTwin } from '../services/digitalTwinService';
import { message } from 'antd';

const DigitalTwinUploader = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) {
      message.error('Please select a 3D model file (e.g., .obj, .glb, .fbx)');
      return;
    }
    setUploading(true);
    try {
      await uploadDigitalTwin(file);
      message.success('Digital twin uploaded successfully');
    } catch (err) {
      console.error(err);
      message.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="digital-twin-uploader" style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', boxShadow: 'var(--shadow-md)' }}>
      <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Upload 3D Digital Twin</h2>
      <input type="file" accept=".obj,.glb,.fbx,.stl" onChange={handleFileChange} style={{ marginBottom: '12px' }} />
      <br />
      <button className="btn-primary" onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading…' : 'Upload'}
      </button>
    </div>
  );
};

export default DigitalTwinUploader;
