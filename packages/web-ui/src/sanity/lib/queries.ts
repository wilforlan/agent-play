import { defineQuery } from "next-sanity";

const blogAuthorProjection = `
  "author": author->{
    name,
    picture
  }
`;

export const blogPostsQuery = defineQuery(`
  *[_type == "post" && defined(slug.current)] | order(coalesce(publishedAt, _updatedAt) desc) {
    _id,
    "title": coalesce(title, "Untitled"),
    "slug": slug.current,
    excerpt,
    "featured": coalesce(featured, false),
    "categories": categories[]->{
      title,
      "slug": slug.current
    },
    content,
    "publishedAt": coalesce(publishedAt, _updatedAt),
    "mainImage": coalesce(mainImage, coverImage),
    ${blogAuthorProjection}
  }
`);

export const blogPostBySlugQuery = defineQuery(`
  *[_type == "post" && slug.current == $slug][0] {
    _id,
    "title": coalesce(title, "Untitled"),
    "slug": slug.current,
    excerpt,
    "featured": coalesce(featured, false),
    "categories": categories[]->{
      title,
      "slug": slug.current
    },
    content,
    "publishedAt": coalesce(publishedAt, _updatedAt),
    "mainImage": coalesce(mainImage, coverImage),
    ${blogAuthorProjection}
  }
`);
