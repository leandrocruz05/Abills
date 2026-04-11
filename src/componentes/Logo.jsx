import logoPng from '../assets/logo.png';

function Logo({ size = 40 }) {
    return (
        <img
            src={logoPng}
            alt="AbilLs Logo"
            className="logo-img"
            style={{ height: size }}
        />
    );
}

export default Logo;
