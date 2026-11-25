import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import UpcomingView from '@/views/UpcomingView.vue'
import LibraryView from '@/views/LibraryView.vue'
import SeriesView from '@/views/SeriesView.vue'
import BookDetailView from '@/views/BookDetailView.vue'
import StatsView from '@/views/StatsView.vue'
import CalendarView from '@/views/CalendarView.vue'
import QuotesView from '@/views/QuotesView.vue'
import MoreView from '@/views/MoreView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/upcoming', name: 'upcoming', component: UpcomingView },
    { path: '/library', name: 'library', component: LibraryView },
    { path: '/series', name: 'series', component: SeriesView },
    { path: '/book/:id', name: 'book-detail', component: BookDetailView },
    { path: '/stats', name: 'stats', component: StatsView },
    { path: '/calendar', name: 'calendar', component: CalendarView },
    { path: '/quotes', name: 'quotes', component: QuotesView },
    { path: '/more', name: 'more', component: MoreView },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})
