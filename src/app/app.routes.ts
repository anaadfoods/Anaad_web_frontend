import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ShopComponent } from './shop/shop.component';
import { ContactComponent } from './contact/contact.component';
import { CommunitiesComponent } from './communities/communities.component';
import { OurStoryComponent } from './our-story/our-story.component';
import { OfferingsComponent } from './offerings/offerings.component';
import { ThankYouComponent } from './thank-you/thank-you.component';
import { BlogsComponent } from './blogs/blogs.component';
import { BlogDetailComponent } from './blog-detail/blog-detail.component';
import { EvidenceArchiveComponent } from './evidence-archive/evidence-archive.component';
import { JoinWaitlistComponent } from './join-waitlist/join-waitlist.component';

export const routes: Routes = [
	{ path: '', component: HomeComponent, title: 'Home • Annad Foods' },
	{ path: 'shop', component: ShopComponent, title: 'Shop • Annad Foods' },
	{ path: 'offerings', component: OfferingsComponent, title: 'Offerings • Annad Foods' },
	{ path: 'our-story', component: OurStoryComponent, title: 'Our Story • Annad Foods' },
	{ path: 'about', redirectTo: 'our-story', pathMatch: 'full' },
	{ path: 'contact', component: ContactComponent, title: 'Contact • Annad Foods' },
	{ path: 'blogs', component: BlogsComponent, title: 'Blogs • Annad Foods' },
	{ path: 'blogs/:id', component: BlogDetailComponent, title: 'Blog • Annad Foods' },
	{ path: 'evidence', component: EvidenceArchiveComponent, title: 'Evidence Archive • Annad Foods' },
	{ path: 'join-waitlist', component: JoinWaitlistComponent, title: 'Join Waitlist • Annad Foods' },
	{ path: 'register', redirectTo: 'join-waitlist', pathMatch: 'full' },
	{ path: 'thank-you', component: ThankYouComponent, title: 'Thank You • Annad Foods' },
	{ path: 'communities', component: CommunitiesComponent, title: 'Communities • Annad Foods' },
	{ path: '**', redirectTo: '' },
];
