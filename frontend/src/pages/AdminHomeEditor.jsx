import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Plus, Trash2, ChevronUp, ChevronDown, Video, ImagePlus } from 'lucide-react';
import api, { toAbsoluteUrl } from '../services/api';
import ImageUploader from '../components/admin/ImageUploader';
import AdminSidebar from '../components/admin/AdminSidebar';

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
        if (res.success) {
          const loaded = res.content;
          // Backward compatibility: older content only ever had a single
          // hero.backgroundImage. If no slide images have been set up yet,
          // seed the new images[] array with it so nothing disappears.
          if (
            loaded?.hero &&
            (!loaded.hero.images || loaded.hero.images.length === 0) &&
            loaded.hero.backgroundImage
          ) {
            loaded.hero = { ...loaded.hero, images: [loaded.hero.backgroundImage] };
          }
          setContent(loaded);
        }
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

  // ---- Hero slide image helpers ----

  const addHeroImage = () => {
    setContent((prev) => ({
      ...prev,
      hero: { ...prev.hero, images: [...(prev.hero?.images || []), ''] }
    }));
  };

  const updateHeroImage = (idx, url) => {
    setContent((prev) => {
      const images = [...(prev.hero?.images || [])];
      images[idx] = url;
      return { ...prev, hero: { ...prev.hero, images } };
    });
  };

  const removeHeroImage = (idx) => {
    setContent((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        images: (prev.hero?.images || []).filter((_, i) => i !== idx)
      }
    }));
  };

  const moveHeroImage = (idx, dir) => {
    setContent((prev) => {
      const images = [...(prev.hero?.images || [])];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= images.length) return prev;
      [images[idx], images[newIdx]] = [images[newIdx], images[idx]];
      return { ...prev, hero: { ...prev.hero, images } };
    });
  };

  const removeAllHeroImages = () => {
    if (!window.confirm('Remove all slide images? The hero video (if any) will stay.')) return;
    setContent((prev) => ({
      ...prev,
      hero: { ...prev.hero, images: [] }
    }));
  };

  const clearAllHeroMedia = () => {
    if (
      !window.confirm(
        'Remove ALL hero media (video + images + background)? The hero section will fall back to its default background.'
      )
    ) {
      return;
    }
    setContent((prev) => ({
      ...prev,
      hero: { ...prev.hero, video: '', images: [] }
    }));
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
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
        <AdminSidebar />
        <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '6rem' }}>
          <div className="spinner" />
        </main>
      </div>
    );
  }

  if (!content) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
        <AdminSidebar />
        <main style={{ flex: 1, padding: '3rem' }}>Failed to load content.</main>
      </div>
    );
  }

  const heroImages = content.hero?.images || [];
  const hasVideo = !!content.hero?.video;
  const hasImages = heroImages.filter(Boolean).length > 0;
  const hasLegacyBg = !!content.hero?.backgroundImage;

  const heroSummary = (() => {
    if (hasVideo && hasImages)
      return 'Video plays first, then the slide images cycle, then back to the video.';
    if (hasVideo && !hasImages)
      return 'Only the video will play — it will loop continuously.';
    if (!hasVideo && hasImages)
      return 'Only the slide images will cycle, in order, and loop.';
    if (!hasVideo && !hasImages && hasLegacyBg)
      return 'Only a single static background image will show.';
    return 'No hero media configured.';
  })();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      <AdminSidebar />

      <main style={{ flex: 1, padding: '2.5rem', maxWidth: '1000px' }}>
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

          {/* Status hint */}
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>Hero currently shows: </strong>
            {heroSummary}
          </div>

          {/* --- Hero Video --- */}
          <Field label="Hero Video (optional)">
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem', lineHeight: 1.5 }}>
              If a video is set, it always plays first on page load. Once it finishes, the slide
              images below rotate one by one, then it loops back to the video. If there are no
              slide images, the video simply loops.
            </p>
            <ImageUploader
              label="Hero Video"
              value={content.hero?.video || ''}
              onChange={(url) => updateField('hero', 'video', url)}
              type="video"
            />
            {content.hero?.video && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                onClick={() => updateField('hero', 'video', '')}
              >
                <Trash2 size={13} /> Remove Video
              </button>
            )}
          </Field>

          {/* --- Hero Slide Images --- */}
          <Field label="Hero Slide Images">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
                gap: '0.75rem',
                flexWrap: 'wrap'
              }}
            >
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, flex: '1 1 260px' }}>
                Add one or more images. They slide in order, looping continuously (after the video, if set).
                Optional — you can leave this empty and use only a video.
              </p>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                {heroImages.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      whiteSpace: 'nowrap',
                      color: '#C5221F',
                      borderColor: '#C5221F'
                    }}
                    onClick={removeAllHeroImages}
                  >
                    <Trash2 size={13} /> Remove All
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}
                  onClick={addHeroImage}
                >
                  <Plus size={13} /> Add Image
                </button>
              </div>
            </div>

            {heroImages.length === 0 ? (
              <div
                style={{
                  border: '1px dashed var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1.5rem',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)'
                }}
              >
                <ImagePlus size={20} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
                <div>No slide images. Click "Add Image" — or leave empty to use video only.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {heroImages.map((img, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1rem'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.6rem'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        Slide {idx + 1}
                      </span>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={idx === 0}
                          onClick={() => moveHeroImage(idx, -1)}
                          title="Move up"
                          style={{ padding: '0.4rem 0.55rem' }}
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={idx === heroImages.length - 1}
                          onClick={() => moveHeroImage(idx, 1)}
                          title="Move down"
                          style={{ padding: '0.4rem 0.55rem' }}
                        >
                          <ChevronDown size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => removeHeroImage(idx)}
                          title="Remove slide"
                          style={{ padding: '0.4rem 0.55rem' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <ImageUploader
                      label={`Slide ${idx + 1} Image`}
                      value={img}
                      onChange={(url) => updateHeroImage(idx, url)}
                    />
                  </div>
                ))}
              </div>
            )}
          </Field>

          {/* --- Slide timing + overlay --- */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Seconds Per Image Slide">
              <input
                type="number"
                className="form-input"
                min="2"
                max="15"
                step="0.5"
                value={content.hero?.slideInterval ?? 4.5}
                onChange={(e) => updateField('hero', 'slideInterval', parseFloat(e.target.value) || 4.5)}
              />
            </Field>

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
            </Field>
          </div>

          {/* Legacy background image — kept as a fallback */}
          <Field label="Background Image (fallback)">
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
              Used only when no slide images above are set. Ignored otherwise.
            </p>
            <ImageUploader
              label="Background Image"
              value={content.hero?.backgroundImage || ''}
              onChange={(url) => updateField('hero', 'backgroundImage', url)}
            />
          </Field>

          {/* Danger zone */}
          {(hasVideo || hasImages) && (
            <div
              style={{
                marginTop: '0.5rem',
                padding: '1rem',
                border: '1px dashed var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-primary)'
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.6rem', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Clear all hero media.</strong>{' '}
                Removes the video and all slide images. The hero falls back to the legacy background image, or the default.
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: '#C5221F',
                  borderColor: '#C5221F'
                }}
                onClick={clearAllHeroMedia}
              >
                <Trash2 size={13} /> Clear All Hero Media
              </button>
            </div>
          )}

          {/* Buttons */}
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
      </main>
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