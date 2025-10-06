import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ShopComponent } from './shop/shop.component';
import { ContactComponent } from './contact/contact.component';
import { AboutComponent } from './about/about.component';

export const routes: Routes = [
	{ path: '', component: HomeComponent, title: 'Home • Annad Foods' },
	{ path: 'shop', component: ShopComponent, title: 'Shop • Annad Foods' },
	{ path: 'about', component: AboutComponent, title: 'About • Annad Foods' },
	{ path: 'contact', component: ContactComponent, title: 'Contact • Annad Foods' },
	{ path: '**', redirectTo: '' },
];
