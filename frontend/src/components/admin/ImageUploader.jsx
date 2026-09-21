import React, { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import api, { toAbsoluteUrl } from '../../services/api';

export default function ImageUploader({ value, onChange, label = 'Image' }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/site-content/homepage/upload', formData);
      if (res.success && res.url) {
        onChange(res.url);
      } else {
        setError('Upload failed');
      }
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '0.7rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          marginBottom: '0.35rem'
        }}
      >
        {label}
      </label>

      {value ? (
        <div
          style={{
            position: 'relative',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            maxWidth: '420px'
          }}
        >
          <img
            src={toAbsoluteUrl(value)}
            alt="Preview"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              padding: '0.5rem',
              backgroundColor: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-light)'
            }}
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              disabled={uploading}
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="btn btn-secondary btn-sm"
              style={{ color: '#C5221F', borderColor: '#C5221F' }}
              disabled={uploading}
            >
              <X size={14} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            border: '2px dashed var(--border-light)',
            borderRadius: 'var(--radius-sm)',
            padding: '2rem 1rem',
            textAlign: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            backgroundColor: 'var(--bg-primary)',
            transition: 'border-color 0.2s, background-color 0.2s',
            maxWidth: '420px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--text-primary)';
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-light)';
            e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
          }}
        >
          {uploading ? (
            <>
              <Loader2
                size={24}
                style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem' }}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Uploading…</p>
            </>
          ) : (
            <>
              <Upload
                size={24}
                style={{ margin: '0 auto 0.5rem', color: 'var(--text-muted)' }}
              />
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                Click to upload or drag &amp; drop
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                JPG, PNG, WEBP — max 5 MB
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <p style={{ color: '#C5221F', fontSize: '0.75rem', marginTop: '0.4rem' }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}