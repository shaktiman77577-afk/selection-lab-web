"use client";

// Purane client components ko naye server pages me lane ka ek hi darwaza.
// Server page inhe yahin se import karta hai, to agar kisi purane component me
// "use client" na likha ho to bhi build nahi tootega.
import AnnouncementBarImpl from "@/app/components/AnnouncementBar";
import SearchBoxImpl from "@/app/components/SearchBox";
import LiveTestBannerImpl from "@/app/components/LiveTestBanner";
import HomePosterImpl from "@/app/components/HomePoster";
import ExamCountdownImpl from "@/app/components/ExamCountdown";
import TestimonialsImpl from "@/app/components/Testimonials";
import CommunitySectionImpl, { CommunityFloat as CommunityFloatImpl } from "@/app/components/CommunityHub";

export const AnnouncementBar = AnnouncementBarImpl;
export const SearchBox = SearchBoxImpl;
export const LiveTestBanner = LiveTestBannerImpl;
export const HomePoster = HomePosterImpl;
export const ExamCountdown = ExamCountdownImpl;
export const Testimonials = TestimonialsImpl;
export const CommunitySection = CommunitySectionImpl;
export const CommunityFloat = CommunityFloatImpl;
