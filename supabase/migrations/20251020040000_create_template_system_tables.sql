-- =====================================================
-- COLLECTION TEMPLATES: Create base template tables
-- =====================================================
-- Purpose: Enable users to create and share collection templates
-- Model: Community-generated templates with copying system
-- =====================================================

-- TABLE 1: collection_templates
-- Community-created collection templates
CREATE TABLE collection_templates (
    id BIGSERIAL PRIMARY KEY,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    rating_avg DECIMAL(3,2) DEFAULT 0.0,
    rating_count INTEGER DEFAULT 0,
    copies_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE 2: template_pages
-- Pages within a template
CREATE TABLE template_pages (
    id BIGSERIAL PRIMARY KEY,
    template_id BIGINT REFERENCES collection_templates(id) ON DELETE CASCADE NOT NULL,
    page_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('team', 'special')),
    slots_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_template_page UNIQUE(template_id, page_number)
);

-- TABLE 3: template_slots
-- Individual slots within pages
CREATE TABLE template_slots (
    id BIGSERIAL PRIMARY KEY,
    page_id BIGINT REFERENCES template_pages(id) ON DELETE CASCADE NOT NULL,
    slot_number INTEGER NOT NULL,
    label TEXT,
    is_special BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_page_slot UNIQUE(page_id, slot_number)
);

-- TABLE 4: user_template_copies
-- User copies of templates
CREATE TABLE user_template_copies (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    template_id BIGINT REFERENCES collection_templates(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    copied_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_template UNIQUE(user_id, template_id)
);

-- Note: We'll enforce the single active copy rule in the application layer
-- rather than with a complex CHECK constraint that causes syntax issues

-- TABLE 5: user_template_progress
-- Progress tracking for each slot in user's copy
CREATE TABLE user_template_progress (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    copy_id BIGINT REFERENCES user_template_copies(id) ON DELETE CASCADE,
    slot_id BIGINT REFERENCES template_slots(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'missing' CHECK (status IN ('missing', 'owned', 'duplicate')),
    count INTEGER DEFAULT 0 CHECK (count >= 0),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, copy_id, slot_id)
);

-- Create indices for performance
-- collection_templates indices
CREATE INDEX idx_templates_author ON collection_templates(author_id);
CREATE INDEX idx_templates_public ON collection_templates(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_templates_rating ON collection_templates(rating_avg DESC, rating_count DESC) WHERE is_public = TRUE;
CREATE INDEX idx_templates_created ON collection_templates(created_at DESC) WHERE is_public = TRUE;

-- template_pages indices
CREATE INDEX idx_template_pages_template ON template_pages(template_id, page_number);

-- template_slots indices
CREATE INDEX idx_template_slots_page ON template_slots(page_id, slot_number);

-- user_template_copies indices
CREATE INDEX idx_user_copies_user ON user_template_copies(user_id);
CREATE INDEX idx_user_copies_active ON user_template_copies(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_copies_template ON user_template_copies(template_id);

-- user_template_progress indices
CREATE INDEX idx_user_progress_copy ON user_template_progress(copy_id, status);
CREATE INDEX idx_user_progress_duplicates ON user_template_progress(copy_id, status, count) WHERE status = 'duplicate' AND count > 0;

-- Add comments for documentation
COMMENT ON TABLE collection_templates IS 'Community-created collection templates';
COMMENT ON TABLE template_pages IS 'Pages within a template';
COMMENT ON TABLE template_slots IS 'Individual slots within pages';
COMMENT ON TABLE user_template_copies IS 'User copies of templates';
COMMENT ON TABLE user_template_progress IS 'Progress tracking for each slot in user''s copy';

-- Enable RLS (Row Level Security) on all tables
ALTER TABLE collection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_template_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_template_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for collection_templates
-- 1. Public read for public templates
CREATE POLICY "Public read access for public templates" ON collection_templates
    FOR SELECT USING (is_public = TRUE);

-- 2. Authors can read their own templates
CREATE POLICY "Authors can read their own templates" ON collection_templates
    FOR SELECT USING (author_id = auth.uid());

-- 3. Authors can insert their own templates
CREATE POLICY "Authors can create their own templates" ON collection_templates
    FOR INSERT WITH CHECK (author_id = auth.uid());

-- 4. Authors can update their own templates
CREATE POLICY "Authors can update their own templates" ON collection_templates
    FOR UPDATE USING (author_id = auth.uid());

-- 5. Authors can delete their own templates
CREATE POLICY "Authors can delete their own templates" ON collection_templates
    FOR DELETE USING (author_id = auth.uid());

-- 6. Admins can do anything
CREATE POLICY "Admins have full access to templates" ON collection_templates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );

-- Create RLS policies for template_pages and template_slots
-- These follow the template's visibility
CREATE POLICY "Public read access for public template pages" ON template_pages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM collection_templates ct 
            WHERE ct.id = template_pages.template_id 
            AND ct.is_public = TRUE
        )
    );

CREATE POLICY "Authors can manage their template pages" ON template_pages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM collection_templates ct 
            WHERE ct.id = template_pages.template_id 
            AND ct.author_id = auth.uid()
        )
    );

-- Same for template_slots
CREATE POLICY "Public read access for public template slots" ON template_slots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM collection_templates ct 
            JOIN template_pages tp ON tp.template_id = ct.id
            WHERE ct.id = tp.template_id 
            AND tp.id = template_slots.page_id
            AND ct.is_public = TRUE
        )
    );

CREATE POLICY "Authors can manage their template slots" ON template_slots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM collection_templates ct 
            JOIN template_pages tp ON tp.template_id = ct.id
            WHERE ct.id = tp.template_id 
            AND tp.id = template_slots.page_id
            AND ct.author_id = auth.uid()
        )
    );

-- Create RLS policies for user_template_copies
-- Users can only manage their own copies
CREATE POLICY "Users can manage their own template copies" ON user_template_copies
    FOR ALL USING (user_id = auth.uid());

-- Create RLS policies for user_template_progress
-- Users can only manage their own progress
CREATE POLICY "Users can manage their own template progress" ON user_template_progress
    FOR ALL USING (user_id = auth.uid());

-- Create triggers for updated_at
CREATE TRIGGER update_collection_templates_updated_at
    BEFORE UPDATE ON collection_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_template_progress_updated_at
    BEFORE UPDATE ON user_template_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();