import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ShopComponent } from './shop/shop.component';
import { ContactComponent } from './contact/contact.component';
import { AboutComponent } from './about/about.component';
import { CommunitiesComponent } from './communities/communities.component';
import { OurStoryComponent } from './our-story/our-story.component';
import { OfferingsComponent } from './offerings/offerings.component';
import { RegisterComponent } from './register/register.component';
import { ThankYouComponent } from './thank-you/thank-you.component';

export const routes: Routes = [
	{ path: '', component: HomeComponent, title: 'Home • Annad Foods' },
		{ path: 'shop', component: ShopComponent, title: 'Shop • Annad Foods' },
		{ path: 'offerings', component: OfferingsComponent, title: 'Offerings • Annad Foods' },
	{ path: 'our-story', component: OurStoryComponent, title: 'Our Story • Annad Foods' },
	{ path: 'about', component: AboutComponent, title: 'About • Annad Foods' },
	{ path: 'contact', component: ContactComponent, title: 'Contact • Annad Foods' },
	{ path: 'register', component: RegisterComponent, title: 'Register • Annad Foods' },
	{ path: 'thank-you', component: ThankYouComponent, title: 'Thank You • Annad Foods' },
	{ path: 'communities', component: CommunitiesComponent, title: 'Communities • Annad Foods' },
	{ path: '**', redirectTo: '' },
];
