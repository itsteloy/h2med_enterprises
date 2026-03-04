import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md p-0">
                <AppLogoIcon />
            </div>
            <div className="text-left">
                 H2-MED Enterprises
                <span className="block text-base font-semibold leading-tight text-gray-800 dark:text-white">
                Point of Sale
                </span>
            </div>
        </div>
    );
}
