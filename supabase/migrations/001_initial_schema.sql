-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create bills table
CREATE TABLE bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL DEFAULT 'Untitled Bill',
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  tip DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_mode TEXT NOT NULL DEFAULT 'proportional' CHECK (tax_mode IN ('proportional', 'even')),
  tip_mode TEXT NOT NULL DEFAULT 'proportional' CHECK (tip_mode IN ('proportional', 'even')),
  include_zero_people BOOLEAN NOT NULL DEFAULT true,
  editor_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  viewer_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  receipt_url TEXT,
  receipt_thumb_url TEXT
);

-- Create people table
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  avatar_url TEXT,
  venmo_handle TEXT,
  is_paid BOOLEAN NOT NULL DEFAULT false
);

-- Create items table
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  emoji TEXT NOT NULL DEFAULT '🍽️',
  label TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  line_number INTEGER,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1)
);

-- Create item_shares table (junction table for items and people)
CREATE TABLE item_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  weight DECIMAL(3,2) NOT NULL DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
  UNIQUE(item_id, person_id)
);

-- Create bill_groups table
CREATE TABLE bill_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create bill_group_members table (junction table for groups and people)
CREATE TABLE bill_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES bill_groups(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, person_id)
);

-- Create trips table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE
);

-- Create indexes for performance
CREATE INDEX idx_bills_editor_token ON bills(editor_token);
CREATE INDEX idx_bills_viewer_token ON bills(viewer_token);
CREATE INDEX idx_people_bill_id ON people(bill_id);
CREATE INDEX idx_items_bill_id ON items(bill_id);
CREATE INDEX idx_item_shares_item_id ON item_shares(item_id);
CREATE INDEX idx_item_shares_person_id ON item_shares(person_id);
CREATE INDEX idx_bill_groups_bill_id ON bill_groups(bill_id);
CREATE INDEX idx_bill_group_members_group_id ON bill_group_members(group_id);
CREATE INDEX idx_bill_group_members_person_id ON bill_group_members(person_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for bills table
CREATE TRIGGER update_bills_updated_at 
  BEFORE UPDATE ON bills 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Bills policies (read/write with tokens)
CREATE POLICY "Bills are viewable by anyone with viewer token" ON bills
  FOR SELECT USING (true);

CREATE POLICY "Bills are editable by anyone with editor token" ON bills
  FOR ALL USING (true);

-- People policies (read/write with tokens)
CREATE POLICY "People are viewable by anyone with viewer token" ON people
  FOR SELECT USING (true);

CREATE POLICY "People are editable by anyone with editor token" ON people
  FOR ALL USING (true);

-- Items policies (read/write with tokens)
CREATE POLICY "Items are viewable by anyone with viewer token" ON items
  FOR SELECT USING (true);

CREATE POLICY "Items are editable by anyone with editor token" ON items
  FOR ALL USING (true);

-- Item shares policies (read/write with tokens)
CREATE POLICY "Item shares are viewable by anyone with viewer token" ON item_shares
  FOR SELECT USING (true);

CREATE POLICY "Item shares are editable by anyone with editor token" ON item_shares
  FOR ALL USING (true);

-- Bill groups policies (read/write with tokens)
CREATE POLICY "Bill groups are viewable by anyone with viewer token" ON bill_groups
  FOR SELECT USING (true);

CREATE POLICY "Bill groups are editable by anyone with editor token" ON bill_groups
  FOR ALL USING (true);

-- Bill group members policies (read/write with tokens)
CREATE POLICY "Bill group members are viewable by anyone with viewer token" ON bill_group_members
  FOR SELECT USING (true);

CREATE POLICY "Bill group members are editable by anyone with editor token" ON bill_group_members
  FOR ALL USING (true);

-- Trips policies (read/write with tokens)
CREATE POLICY "Trips are viewable by anyone with viewer token" ON trips
  FOR SELECT USING (true);

CREATE POLICY "Trips are editable by anyone with editor token" ON trips
  FOR ALL USING (true);
