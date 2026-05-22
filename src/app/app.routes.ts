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
import { TermsConditionsComponent } from './terms-conditions/terms-conditions.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { DeleteAccountComponent } from './delete-account/delete-account.component';

export const routes: Routes = [
	{ path: '', component: HomeComponent, title: 'Home • Anaad Foods' },
	{ path: 'shop', component: ShopComponent, title: 'Shop • Anaad Foods' },
	{ path: 'offerings', component: OfferingsComponent, title: 'Offerings • Anaad Foods' },
	{ path: 'our-story', component: OurStoryComponent, title: 'Our Story • Anaad Foods' },
	{ path: 'about', redirectTo: 'our-story', pathMatch: 'full' },
	{ path: 'contact', component: ContactComponent, title: 'Contact • Anaad Foods' },
	{ path: 'blogs', component: BlogsComponent, title: 'Blogs • Anaad Foods' },
	{ path: 'blogs/:id', component: BlogDetailComponent, title: 'Blog • Anaad Foods' },
	{ path: 'evidence', component: EvidenceArchiveComponent, title: 'Evidence Archive • Anaad Foods' },
	{ path: 'join-waitlist', component: JoinWaitlistComponent, title: 'Join Waitlist • Anaad Foods' },
	{ path: 'register', redirectTo: 'join-waitlist', pathMatch: 'full' },
	{ path: 'thank-you', component: ThankYouComponent, title: 'Thank You • Anaad Foods' },
	{ path: 'communities', component: CommunitiesComponent, title: 'Communities • Anaad Foods' },
	{ path: 'terms-conditions', component: TermsConditionsComponent, title: 'Terms & Conditions • Anaad Foods' },
	{ path: 'privacy-policy', component: PrivacyPolicyComponent, title: 'Privacy Policy • Anaad Foods' },
	{ path: 'delete-account', component: DeleteAccountComponent, title: 'Delete Account • Anaad Foods' },
	{ path: '**', redirectTo: '' },
];

