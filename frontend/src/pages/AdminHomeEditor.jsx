import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft } from 'lucide-react';
import api, { toAbsoluteUrl } from '../services/api';
import ImageUploader from '../components/admin/ImageUploader';

export default function AdminHomeEditor() {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/site-content/homepage');
        if (res.success) setContent(res.content);
      } catch (err) {
        // Handle loading error silently
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateField = (section, field, value) => {
    setContent((prev) => {
      if (!section) return { ...prev, [field]: value };
      return {
        ...prev,
        [section]: { ...prev[section], [field]: value }
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const { _id, key, __v, createdAt, updatedAt, ...payload } = content;
      const res = await api.put('/site-content/homepage', payload);
      if (res.success) {
        setContent(res.content);
        setMessage('Saved successfully ✓');
        setTimeout(() => setMessage(''), 2500);
      }
    } catch (err) {
      setMessage(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!content) {
    return <div style={{ padding: '3rem' }}>Failed to load content.</div>;
  }

  return (
    <div style={{ padding: '2.5rem', maxWidth: '960px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <button
            onClick={() => navigate('/admin')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem' }}>Edit Homepage</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Every field below controls a section on the public home page. Changes appear immediately.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {message && (
            <span
              style={{
                fontSize: '0.8rem',
                color: message.includes('✓') ? '#137333' : '#C5221F'
              }}
            >
              {message}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Announcement Bar */}
      <Section title="Announcement Bar">
        <Field label="Enabled">
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              checked={content.announcement?.enabled ?? true}
              onChange={(e) => updateField('announcement', 'enabled', e.target.checked)}
            />
            Show announcement bar
          </label>
        </Field>
        <Field label="Scrolling Text">
          <textarea
            className="form-textarea"
            rows={2}
            value={content.announcement?.text || ''}
            onChange={(e) => updateField('announcement', 'text', e.target.value)}
          />
        </Field>
      </Section>

      {/* Hero */}
      <Section title="Hero Section">
        <Field label="Badge Text">
          <input
            className="form-input"
            value={content.hero?.badge || ''}
            onChange={(e) => updateField('hero', 'badge', e.target.value)}
          />
        </Field>
        <Field label="Heading">
          <input
            className="form-input"
            value={content.hero?.heading || ''}
            onChange={(e) => updateField('hero', 'heading', e.target.value)}
          />
        </Field>
        <Field label="Subheading">
          <textarea
            className="form-textarea"
            rows={3}
            value={content.hero?.subheading || ''}
            onChange={(e) => updateField('hero', 'subheading', e.target.value)}
          />
        </Field>

       <ImageUploader
  label="Background Image"
  value={content.hero?.backgroundImage || ''}
  onChange={(url) => updateField('hero', 'backgroundImage', url)}
/>

<Field
  label={`Background Overlay Opacity — ${Math.round(
    (content.hero?.overlayOpacity ?? 0.9) * 100
  )}%`}
>
  <input
    type="range"
    min="0"
    max="1"
    step="0.05"
    value={content.hero?.overlayOpacity ?? 0.9}
    onChange={(e) => updateField('hero', 'overlayOpacity', parseFloat(e.target.value))}
    style={{ width: '100%', accentColor: 'var(--text-primary)' }}
  />

  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '0.7rem',
      color: 'var(--text-muted)',
      marginTop: '0.25rem'
    }}
  >
    <span>0% (full image)</span>
    <span>50%</span>
    <span>100% (image hidden)</span>
  </div>

  {/* Live preview swatch — shows exactly what the hero will look like */}
  <div
    style={{
      marginTop: '0.5rem',
      height: '80px',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-light)',
      backgroundImage: `linear-gradient(rgba(250,250,250,${
        (content.hero?.overlayOpacity ?? 0.9) - 0.05
      }), rgba(250,250,250,${content.hero?.overlayOpacity ?? 0.9})), url("${toAbsoluteUrl(
        content.hero?.backgroundImage || ''
      )}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}
  />
</Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="Primary Button Text">
            <input
              className="form-input"
              value={content.hero?.primaryBtnText || ''}
              onChange={(e) => updateField('hero', 'primaryBtnText', e.target.value)}
            />
          </Field>
          <Field label="Primary Button Link">
            <input
              className="form-input"
              value={content.hero?.primaryBtnLink || ''}
              onChange={(e) => updateField('hero', 'primaryBtnLink', e.target.value)}
            />
          </Field>
          <Field label="Secondary Button Text">
            <input
              className="form-input"
              value={content.hero?.secondaryBtnText || ''}
              onChange={(e) => updateField('hero', 'secondaryBtnText', e.target.value)}
            />
          </Field>
          <Field label="Secondary Button Link">
            <input
              className="form-input"
              value={content.hero?.secondaryBtnLink || ''}
              onChange={(e) => updateField('hero', 'secondaryBtnLink', e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* Categories Section */}
      <Section title="Featured Categories Section">
        <Field label="Eyebrow Text">
          <input
            className="form-input"
            value={content.categoriesSection?.eyebrow || ''}
            onChange={(e) => updateField('categoriesSection', 'eyebrow', e.target.value)}
          />
        </Field>
        <Field label="Heading">
          <input
            className="form-input"
            value={content.categoriesSection?.heading || ''}
            onChange={(e) => updateField('categoriesSection', 'heading', e.target.value)}
          />
        </Field>
      </Section>

      {/* Featured Products Section */}
      <Section title="Featured Products Section">
        <Field label="Eyebrow Text">
          <input
            className="form-input"
            value={content.featuredSection?.eyebrow || ''}
            onChange={(e) => updateField('featuredSection', 'eyebrow', e.target.value)}
          />
        </Field>
        <Field label="Heading">
          <input
            className="form-input"
            value={content.featuredSection?.heading || ''}
            onChange={(e) => updateField('featuredSection', 'heading', e.target.value)}
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="CTA Button Text">
            <input
              className="form-input"
              value={content.featuredSection?.ctaText || ''}
              onChange={(e) => updateField('featuredSection', 'ctaText', e.target.value)}
            />
          </Field>
          <Field label="CTA Button Link">
            <input
              className="form-input"
              value={content.featuredSection?.ctaLink || ''}
              onChange={(e) => updateField('featuredSection', 'ctaLink', e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* Brand Story */}
      <Section title="Brand Story Section">
        <Field label="Eyebrow Text">
          <input
            className="form-input"
            value={content.brandStory?.eyebrow || ''}
            onChange={(e) => updateField('brandStory', 'eyebrow', e.target.value)}
          />
        </Field>
        <Field label="Heading">
          <input
            className="form-input"
            value={content.brandStory?.heading || ''}
            onChange={(e) => updateField('brandStory', 'heading', e.target.value)}
          />
        </Field>
        <Field label="Paragraph 1">
          <textarea
            className="form-textarea"
            rows={3}
            value={content.brandStory?.paragraph1 || ''}
            onChange={(e) => updateField('brandStory', 'paragraph1', e.target.value)}
          />
        </Field>
        <Field label="Paragraph 2">
          <textarea
            className="form-textarea"
            rows={3}
            value={content.brandStory?.paragraph2 || ''}
            onChange={(e) => updateField('brandStory', 'paragraph2', e.target.value)}
          />
        </Field>

        <ImageUploader
          label="Brand Story Image"
          value={content.brandStory?.image || ''}
          onChange={(url) => updateField('brandStory', 'image', url)}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <Field label="CTA Button Text">
            <input
              className="form-input"
              value={content.brandStory?.ctaText || ''}
              onChange={(e) => updateField('brandStory', 'ctaText', e.target.value)}
            />
          </Field>
          <Field label="CTA Button Link">
            <input
              className="form-input"
              value={content.brandStory?.ctaLink || ''}
              onChange={(e) => updateField('brandStory', 'ctaLink', e.target.value)}
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}

/* --- Small layout helpers --- */

function Section({ title, children }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-sm)',
        padding: '1.75rem',
        marginBottom: '1.5rem'
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.25rem',
          marginBottom: '1.25rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--border-light)'
        }}
      >
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
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
      {children}
    </div>
  );
}