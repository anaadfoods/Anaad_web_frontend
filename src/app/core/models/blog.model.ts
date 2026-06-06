// ============================================
// Blog & Research Paper Models
// Mapped from: /api/blogs/*, /api/research-papers/*
// ============================================

/** GET /api/blogs/ */
export interface Blog {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  cover_image: string;
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
  read_time?: number;
}

/** GET /api/research-papers/ */
export interface ResearchPaper {
  id: number;
  title: string;
  abstract: string;
  authors: string;
  publication: string;
  published_date: string;
  file_url: string;
  cover_image?: string;
  category: string;
  tags: string[];
  created_at: string;
}

/** GET /api/user-queries/ & POST /api/user-queries/ */
export interface UserQuery {
  id?: number;
  name: string;
  email: string;
  phone_number: string;
  message: string;
  requirement_type: string;
  created_at?: string;
}
