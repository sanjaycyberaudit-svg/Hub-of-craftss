import { gql } from "@/gql";

export const TestimonialCardFragment = gql(/* GraphQL */ `
  fragment TestimonialCardFragment on testimonials {
    id
    kind
    customer_name
    location
    quote
    rating
    video_url
    featuredImage: medias {
      key
      alt
    }
  }
`);

export const TestimonialColumnsFragment = gql(/* GraphQL */ `
  fragment TestimonialColumnsFragment on testimonials {
    id
    kind
    customer_name
    location
    quote
    rating
    is_published
    order
  }
`);

export const TestimonialFormFragment = gql(/* GraphQL */ `
  fragment TestimonialFormFragment on testimonials {
    id
    kind
    customer_name
    location
    quote
    rating
    video_url
    featured_image_id
    is_published
    order
  }
`);

export const UpdateTestimonialMutation = gql(/* GraphQL */ `
  mutation UpdateTestimonialMutation(
    $id: String
    $kind: String
    $customerName: String
    $location: String
    $quote: String
    $rating: Int
    $videoUrl: String
    $featuredImageId: String
    $isPublished: Boolean
    $order: Int
  ) {
    updatetestimonialsCollection(
      filter: { id: { eq: $id } }
      set: {
        kind: $kind
        customer_name: $customerName
        location: $location
        quote: $quote
        rating: $rating
        video_url: $videoUrl
        featured_image_id: $featuredImageId
        is_published: $isPublished
        order: $order
      }
    ) {
      affectedCount
      records {
        __typename
        nodeId
      }
    }
  }
`);

export const CreateTestimonialMutation = gql(/* GraphQL */ `
  mutation CreateTestimonialMutation(
    $id: String
    $kind: String
    $customerName: String
    $location: String
    $quote: String
    $rating: Int
    $videoUrl: String
    $featuredImageId: String
    $isPublished: Boolean
    $order: Int
  ) {
    insertIntotestimonialsCollection(
      objects: {
        id: $id
        kind: $kind
        customer_name: $customerName
        location: $location
        quote: $quote
        rating: $rating
        video_url: $videoUrl
        featured_image_id: $featuredImageId
        is_published: $isPublished
        order: $order
      }
    ) {
      affectedCount
      records {
        __typename
      }
    }
  }
`);
