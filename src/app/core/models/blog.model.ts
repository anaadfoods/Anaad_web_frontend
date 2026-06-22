// ============================================
// Blog & Research Paper Models
// Mapped from: /api/blogs/*, /api/blog/research-papers/*
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

/** GET /api/blog/research-papers/ */
export interface ResearchPaper {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  publication_date: string;
  external_link: string | null;
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
