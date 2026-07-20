from django.contrib.auth import authenticate, get_user_model
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework import status

def _auth_with_email_or_username(request, email_or_user, password):
    u = authenticate(request, username=email_or_user, password=password)
    if u is not None:
        return u
    User = get_user_model()
    try:
        obj = User.objects.get(email=email_or_user)
        uname = getattr(obj, 'username', getattr(obj, 'email', email_or_user))
        return authenticate(request, username=uname, password=password)
    except User.DoesNotExist:
        return None

@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def api_login(request):
    email = (request.data.get('email') or request.data.get('username') or '').strip()
    password = (request.data.get('password') or '')
    if not email or not password:
        return Response({'detail': 'Missing credentials'}, status=status.HTTP_400_BAD_REQUEST)
    user = _auth_with_email_or_username(request, email, password)
    if user is None:
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    token, _ = Token.objects.get_or_create(user=user)
    user_payload = {'id': user.id, 'email': getattr(user, 'email', ''), 'name': getattr(user, 'get_full_name', lambda: '')() or getattr(user, 'email', '')}
    return Response({'token': token.key, 'user': user_payload}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def api_logout(request):
    tok = request.META.get('HTTP_AUTHORIZATION', '').split()
    if len(tok) == 2 and tok[0].lower() == 'token':
        Token.objects.filter(key=tok[1]).delete()
    return Response({'ok': True})
